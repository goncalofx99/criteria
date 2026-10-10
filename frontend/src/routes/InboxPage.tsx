import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useApolloClient, useMutation, useQuery, useSubscription } from '@apollo/client'
import { ArrowLeft, ArrowUp, Inbox, Loader2, MessageCircle } from 'lucide-react'
import { GET_CONVERSATION, GET_MY_CONVERSATIONS, GET_OLDER_MESSAGES, MESSAGE_SENT, SEND_MESSAGE } from '@/lib/gql'
import { useMe } from '@/hooks/useMe'
import { Button } from '@/components/ui/button'
import { MemberAvatar } from '@/components/ui/member-avatar'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { getLanguage, languageTag, localizedError, useLanguage } from '@/lib/language'

interface MessageData {
  id: string
  body: string
  createdAt: string
  sender: { id: string; fullName: string | null; avatarUrl: string | null }
}

interface ConversationData {
  id: string
  createdAt: string
  buyer: { id: string; fullName: string | null; avatarUrl: string | null }
  seller: { id: string; fullName: string | null; avatarUrl: string | null }
  buyerPost: { id: string; title: string } | null
  sellerPost: { id: string; title: string; images: string[] } | null
  messages: MessageData[]
}

const CONVERSATION_PAGE_SIZE = 30
const MESSAGE_PAGE_SIZE = 100

function mergeMessages(current: MessageData[], incoming: MessageData[]): MessageData[] {
  const byId = new Map(current.map(message => [message.id, message]))
  for (const message of incoming) byId.set(message.id, message)
  return [...byId.values()].sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id))
}

function conversationTitle(conversation: ConversationData, myId?: string) {
  const person = conversation.buyer.id === myId ? conversation.seller : conversation.buyer
  return person.fullName || (getLanguage() === 'pt' ? 'Membro da CRITERIA' : 'CRITERIA member')
}

function conversationSubject(conversation: ConversationData) {
  return conversation.sellerPost?.title || conversation.buyerPost?.title || (getLanguage() === 'pt' ? 'Conversa' : 'Conversation')
}

export default function InboxPage() {
  const { language, t } = useLanguage()
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const client = useApolloClient()
  const { me } = useMe()
  const [drafts, setDrafts] = useState<Record<string, string>>({})
  const draft = id ? drafts[id] ?? '' : ''
  const [sendError, setSendError] = useState<string | null>(null)
  const [loadingMoreConversations, setLoadingMoreConversations] = useState(false)
  const [hasMoreConversations, setHasMoreConversations] = useState(true)
  const [loadingOlder, setLoadingOlder] = useState(false)
  const [pagingError, setPagingError] = useState<string | null>(null)
  const [historyError, setHistoryError] = useState<string | null>(null)
  const [hasOlderMessages, setHasOlderMessages] = useState<Record<string, boolean>>({})
  const [messageHistory, setMessageHistory] = useState<Record<string, MessageData[]>>({})
  const [composerFocused, setComposerFocused] = useState(false)
  const activeThreadIdRef = useRef(id)
  activeThreadIdRef.current = id
  const messagesRef = useRef<HTMLDivElement>(null)
  const threadRef = useRef<HTMLElement>(null)
  const listHeadingRef = useRef<HTMLHeadingElement>(null)
  const previousRouteIdRef = useRef<string | undefined>(undefined)
  const lastRenderedThreadRef = useRef<string | null>(null)
  const lastRenderedMessageCountRef = useRef(0)
  const nearBottomRef = useRef(true)
  const pendingHistoryRestoreRef = useRef<{ threadId: string; scrollHeight: number; scrollTop: number } | null>(null)
  const { data: listData, loading: listLoading, error: listError, refetch: refetchList, fetchMore } = useQuery<{ myConversations: ConversationData[] }>(GET_MY_CONVERSATIONS, {
    variables: { limit: CONVERSATION_PAGE_SIZE, offset: 0 },
    fetchPolicy: 'cache-and-network',
  })
  const { data: detailData, loading: detailLoading, error: detailError, refetch: refetchDetail } = useQuery<{ conversation: ConversationData | null }>(GET_CONVERSATION, { variables: { id }, skip: !id, fetchPolicy: 'cache-and-network' })
  const [sendMessage, { loading: sending }] = useMutation(SEND_MESSAGE)

  useSubscription(MESSAGE_SENT, {
    variables: { conversationId: id },
    skip: !id,
    onData: ({ data }) => {
      const message = data.data?.messageSent as MessageData | undefined
      if (!message || !id) return
      client.cache.updateQuery<{ conversation: ConversationData | null }>({ query: GET_CONVERSATION, variables: { id } }, previous => {
        if (!previous?.conversation || previous.conversation.messages.some(item => item.id === message.id)) return previous
        return { conversation: { ...previous.conversation, messages: [...previous.conversation.messages, message] } }
      })
      void refetchList()
    },
  })

  const conversation = detailData?.conversation || null
  const visibleMessages = conversation ? messageHistory[conversation.id] ?? conversation.messages : []
  const canLoadOlder = Boolean(conversation && visibleMessages.length > 0 &&
    (hasOlderMessages[conversation.id] ?? conversation.messages.length === MESSAGE_PAGE_SIZE))
  const canLoadMoreConversations = hasMoreConversations &&
    (listData?.myConversations.length ?? 0) >= CONVERSATION_PAGE_SIZE

  useEffect(() => {
    if (!conversation) return
    setMessageHistory(current => {
      const previous = current[conversation.id] ?? []
      const merged = mergeMessages(previous, conversation.messages)
      return merged.length === previous.length ? current : { ...current, [conversation.id]: merged }
    })
  }, [conversation])

  async function loadMoreConversations() {
    if (loadingMoreConversations || !listData?.myConversations.length) return
    setLoadingMoreConversations(true)
    setPagingError(null)
    try {
      const result = await fetchMore({
        variables: { limit: CONVERSATION_PAGE_SIZE, offset: listData.myConversations.length },
        updateQuery: (previous, { fetchMoreResult }) => {
          if (!fetchMoreResult) return previous
          const existingIds = new Set(previous.myConversations.map(item => item.id))
          return { myConversations: [
            ...previous.myConversations,
            ...fetchMoreResult.myConversations.filter(item => !existingIds.has(item.id)),
          ] }
        },
      })
      setHasMoreConversations(result.data.myConversations.length === CONVERSATION_PAGE_SIZE)
    } catch (cause) {
      setPagingError(localizedError(cause, language, 'Não foi possível carregar mais conversas.', 'Could not load more conversations.'))
    } finally {
      setLoadingMoreConversations(false)
    }
  }

  async function loadOlderMessages() {
    if (!id || !canLoadOlder || loadingOlder) return
    const first = visibleMessages[0]
    if (!first) return
    setLoadingOlder(true)
    setHistoryError(null)
    const panel = messagesRef.current
    if (panel) pendingHistoryRestoreRef.current = { threadId: id, scrollHeight: panel.scrollHeight, scrollTop: panel.scrollTop }
    try {
      const before = `${first.createdAt}|${first.id}`
      const { data } = await client.query<{ conversation: { messages: MessageData[] } | null }>({
        query: GET_OLDER_MESSAGES,
        variables: { id, before },
        fetchPolicy: 'network-only',
      })
      const older = data.conversation?.messages ?? []
      if (older.length === 0) pendingHistoryRestoreRef.current = null
      setMessageHistory(current => ({ ...current, [id]: mergeMessages(current[id] ?? visibleMessages, older) }))
      setHasOlderMessages(current => ({ ...current, [id]: older.length === MESSAGE_PAGE_SIZE }))
    } catch (cause) {
      pendingHistoryRestoreRef.current = null
      setHistoryError(localizedError(cause, language, 'Não foi possível carregar mensagens anteriores.', 'Could not load earlier messages.'))
    } finally {
      setLoadingOlder(false)
    }
  }
  useEffect(() => {
    setSendError(null)
    setHistoryError(null)
    setComposerFocused(false)
    pendingHistoryRestoreRef.current = null
  }, [id])

  useEffect(() => {
    const previousId = previousRouteIdRef.current
    previousRouteIdRef.current = id
    if (!window.matchMedia('(max-width: 767px)').matches) return
    const frame = requestAnimationFrame(() => {
      if (id) threadRef.current?.focus()
      else if (previousId) listHeadingRef.current?.focus()
    })
    return () => cancelAnimationFrame(frame)
  }, [id])

  useLayoutEffect(() => {
    const panel = messagesRef.current
    if (!panel || !conversation) return
    const count = visibleMessages.length
    const restore = pendingHistoryRestoreRef.current
    if (restore?.threadId === conversation.id && count > lastRenderedMessageCountRef.current) {
      panel.scrollTop = restore.scrollTop + panel.scrollHeight - restore.scrollHeight
      pendingHistoryRestoreRef.current = null
      nearBottomRef.current = false
    } else if (lastRenderedThreadRef.current !== conversation.id) {
      panel.scrollTop = panel.scrollHeight
      nearBottomRef.current = true
    } else if (count > lastRenderedMessageCountRef.current) {
      const lastMessage = visibleMessages.at(-1)
      if (nearBottomRef.current || lastMessage?.sender.id === me?.id) {
        panel.scrollTop = panel.scrollHeight
        nearBottomRef.current = true
      }
    }
    lastRenderedThreadRef.current = conversation.id
    lastRenderedMessageCountRef.current = count
  }, [conversation, visibleMessages, me?.id])

  function trackMessageScroll() {
    const panel = messagesRef.current
    if (!panel) return
    nearBottomRef.current = panel.scrollHeight - panel.scrollTop - panel.clientHeight < 96
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    const body = draft.trim()
    if (!id || !body || sending) return
    const threadId = id
    setSendError(null)
    try {
      await sendMessage({ variables: { conversationId: threadId, body } })
      setDrafts(current => current[threadId] === draft ? { ...current, [threadId]: '' } : current)
      void Promise.allSettled([
        refetchList(),
        ...(activeThreadIdRef.current === threadId ? [refetchDetail()] : []),
      ])
    } catch (cause) {
      if (activeThreadIdRef.current === threadId) {
        setSendError(localizedError(cause, language, 'Não foi possível enviar a mensagem. Tente novamente.', 'Message could not be sent. Try again.'))
      }
    }
  }

  return (
    <div className={cn(
      'workspace-content flex h-full min-h-0 max-w-[1180px] flex-col px-4 pt-5 md:h-auto md:px-8 md:py-8 lg:px-10',
      composerFocused && id ? 'pb-0 md:pb-8' : 'pb-[calc(72px+env(safe-area-inset-bottom))] md:pb-8',
    )}>
      <div className={cn('mb-5 shrink-0 md:mb-6', id && 'hidden md:block')}>
        <h1 ref={listHeadingRef} tabIndex={-1} className="editorial-title focus:outline-none">{t('Mensagens', 'Inbox')}</h1>
        <p className="editorial-subtitle mt-2 text-sm">{t('Conversas sobre imóveis e critérios.', 'Conversations about properties and criteria.')}</p>
      </div>
      <div className="-mx-4 grid min-h-0 flex-1 overflow-hidden bg-surface md:mx-0 md:h-[72dvh] md:max-h-[760px] md:min-h-[520px] md:grid-cols-[minmax(260px,320px)_minmax(0,1fr)] md:rounded-md md:border md:border-border">
        <aside className={cn(id ? 'hidden md:block' : 'block', 'min-h-0 overflow-y-auto md:border-r md:border-border')} aria-label={t('Conversas', 'Conversations')}>
          <div className="hidden border-b border-border px-5 py-4 text-sm font-semibold md:block">{t('Conversas', 'Conversations')}</div>
          {listLoading && !listData && <div role="status" aria-label={t('A carregar conversas', 'Loading conversations')} className="space-y-1"><span className="sr-only">{t('A carregar conversas…', 'Loading conversations…')}</span>{Array.from({ length: 5 }, (_, index) => <div key={index} aria-hidden="true" className="flex gap-3 border-b border-border px-4 py-4 md:px-5"><Skeleton className="h-11 w-11 shrink-0 rounded-full" /><div className="flex-1 space-y-2"><Skeleton className="h-4 w-3/4" /><Skeleton className="h-3 w-1/2" /></div></div>)}</div>}
          {listError && <div className="p-5 text-sm"><p role="alert" className="text-destructive">{listData ? t('As conversas podem estar desatualizadas.', 'Conversations may be out of date.') : t('Não foi possível carregar as conversas.', 'Couldn’t load conversations.')}</p><button type="button" onClick={() => void refetchList()} className="mt-3 inline-flex min-h-11 items-center font-semibold text-primary underline underline-offset-4">{t('Tentar novamente', 'Try again')}</button></div>}
          {!listError && listData?.myConversations.length === 0 && <div className="mx-auto flex min-h-full max-w-sm flex-col items-center justify-center px-7 py-12 text-center"><span className="mb-5 flex h-14 w-14 items-center justify-center rounded-md bg-primary-100 text-primary"><MessageCircle size={25} aria-hidden="true" /></span><h2 className="text-xl font-semibold">{t('Ainda não há conversas', 'No conversations yet')}</h2><p className="mt-2 text-sm leading-relaxed text-muted-foreground">{t('Quando contactar outro membro, as mensagens aparecerão aqui.', 'When you contact another member, your messages will appear here.')}</p></div>}
          <div className="divide-y divide-border/70">
            {listData?.myConversations.map(item => {
              const last = item.messages.at(-1)
              const person = item.buyer.id === me?.id ? item.seller : item.buyer
              return <Link key={item.id} to={`/inbox/${item.id}`} className={cn('block min-h-[88px] border-l-2 border-transparent px-4 py-4 transition-colors hover:bg-accent focus-visible:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring md:px-5', item.id === id && 'border-l-primary bg-primary-100')} aria-current={item.id === id ? 'page' : undefined}>
                <div className="flex items-center gap-3">
                  <MemberAvatar member={person} className="h-11 w-11 text-sm" />
                  <span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold text-foreground">{conversationTitle(item, me?.id)}</span><span className="mt-0.5 block truncate text-xs text-muted-foreground">{conversationSubject(item)}</span></span>
                </div>
                {last && <p className="mt-2 truncate pl-14 text-xs text-muted-foreground">{last.body}</p>}
              </Link>
            })}
          </div>
          {pagingError && <p role="alert" className="px-5 py-3 text-sm text-destructive">{pagingError}</p>}
          {canLoadMoreConversations && <div className="p-4 text-center"><Button type="button" variant="outline" disabled={loadingMoreConversations} onClick={() => void loadMoreConversations()}>{loadingMoreConversations ? t('A carregar…', 'Loading…') : t('Carregar mais conversas', 'Load more conversations')}</Button></div>}
        </aside>
        <section ref={threadRef} tabIndex={-1} className={cn(id ? 'flex' : 'hidden md:flex', 'min-h-0 min-w-0 flex-col focus:outline-none')} aria-label={t('Conversa selecionada', 'Selected conversation')}>
          {!id ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center text-muted-foreground"><Inbox size={32} className="text-primary-600" aria-hidden="true" /><p className="text-sm">{t('Escolha uma conversa para ler e responder.', 'Choose a conversation to read and reply.')}</p></div>
          ) : detailLoading && !conversation ? (
            <div role="status" aria-label={t('A carregar mensagens', 'Loading messages')} className="flex flex-1 flex-col gap-4 p-5 md:p-7"><span className="sr-only">{t('A carregar mensagens…', 'Loading messages…')}</span><Skeleton className="h-12 w-3/5" /><Skeleton className="h-14 w-2/3 self-end" /><Skeleton className="h-14 w-1/2" /><Skeleton className="h-12 w-3/5 self-end" /></div>
          ) : detailError && !conversation ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-4 p-6 text-center text-sm"><p role="alert">{t('Não foi possível carregar esta conversa.', 'Couldn’t load this conversation.')}</p><Button variant="outline" onClick={() => void refetchDetail()}>{t('Tentar novamente', 'Try again')}</Button><button type="button" onClick={() => navigate('/inbox')} className="min-h-11 font-semibold text-primary underline underline-offset-4">{t('Voltar às mensagens', 'Back to Inbox')}</button></div>
          ) : !conversation ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center text-sm"><p role="alert">{t('Esta conversa não está disponível.', 'This conversation is unavailable.')}</p><Button variant="outline" onClick={() => navigate('/inbox')}>{t('Voltar às mensagens', 'Back to Inbox')}</Button></div>
          ) : (
            <>
              <div className="flex shrink-0 items-center gap-3 border-b border-border px-3 py-3 md:px-6">
                <button type="button" onClick={() => navigate('/inbox')} aria-label={t('Voltar às conversas', 'Back to conversations')} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-sm hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:hidden"><ArrowLeft size={20} aria-hidden="true" /></button>
                <MemberAvatar member={conversation.buyer.id === me?.id ? conversation.seller : conversation.buyer} className="h-10 w-10 text-sm" />
                <div className="min-w-0"><h2 className="truncate text-base font-semibold">{conversationTitle(conversation, me?.id)}</h2><p className="truncate text-xs text-muted-foreground">{conversationSubject(conversation)}</p></div>
              </div>
              {detailError && <div className="border-b border-warning/30 bg-warning-muted px-4 py-2 text-sm text-warning-foreground">{t('As mensagens podem estar desatualizadas.', 'Messages may be out of date.')} <button type="button" onClick={() => void refetchDetail()} className="font-semibold underline">{t('Repetir', 'Retry')}</button></div>}
              <div ref={messagesRef} onScroll={trackMessageScroll} className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto bg-background/60 p-4 md:p-6" role="log" aria-label={t(`Mensagens com ${conversationTitle(conversation, me?.id)}`, `Messages with ${conversationTitle(conversation, me?.id)}`)} aria-relevant="additions">
                {historyError && <p role="alert" className="text-center text-sm text-destructive">{historyError}</p>}
                {canLoadOlder && <div className="text-center"><Button type="button" variant="outline" disabled={loadingOlder} onClick={() => void loadOlderMessages()}>{loadingOlder ? t('A carregar…', 'Loading…') : t('Carregar mensagens anteriores', 'Load earlier messages')}</Button></div>}
                {visibleMessages.length === 0 && <p className="my-auto text-center text-sm text-muted-foreground">{t('Comece a conversa com uma breve apresentação.', 'Start the conversation with a helpful introduction.')}</p>}
                {visibleMessages.map(message => {
                  const own = message.sender.id === me?.id
                  return <div key={message.id} className={cn('max-w-[85%] rounded-md px-4 py-3 text-sm leading-relaxed lg:max-w-[640px]', own ? 'self-end rounded-br-none bg-primary text-primary-foreground' : 'self-start rounded-bl-none bg-accent text-foreground')}>
                    <span className="sr-only">{own ? t('Você', 'You') : conversationTitle(conversation, me?.id)}: </span>
                    <p className="whitespace-pre-wrap break-words">{message.body}</p>
                    <time className={cn('mt-1 block text-xs', own ? 'text-primary-200' : 'text-muted-foreground')} dateTime={message.createdAt}>{new Date(message.createdAt).toLocaleString(languageTag(language), { dateStyle: 'short', timeStyle: 'short' })}</time>
                  </div>
                })}
              </div>
              <form onSubmit={submit} className="shrink-0 border-t border-border bg-surface px-3 pb-[max(12px,env(safe-area-inset-bottom))] pt-3 md:p-5">
                {sendError && <p role="alert" className="mb-2 text-sm text-destructive">{sendError}</p>}
                <div className="flex items-end gap-2">
                  <label htmlFor="message-body" className="sr-only">{t('Mensagem', 'Message')}</label>
                  <textarea id="message-body" value={draft} onChange={event => { if (id) setDrafts(current => ({ ...current, [id]: event.target.value })) }} onFocus={() => setComposerFocused(true)} onBlur={() => setComposerFocused(false)} maxLength={5000} rows={2} placeholder={t('Escreva uma mensagem…', 'Write a message…')} className="min-h-12 max-h-32 min-w-0 flex-1 resize-none overflow-y-auto rounded-md border border-border bg-surface px-4 py-3 text-base text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
                  <Button type="submit" size="icon" aria-label={sending ? t('A enviar mensagem', 'Sending message') : t('Enviar mensagem', 'Send message')} disabled={!draft.trim() || sending} className="h-12 w-12 shrink-0">{sending ? <Loader2 size={18} className="animate-spin" aria-hidden="true" /> : <ArrowUp size={18} aria-hidden="true" />}</Button>
                </div>
              </form>
            </>
          )}
        </section>
      </div>
    </div>
  )
}
