import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useApolloClient, useMutation, useQuery, useSubscription } from '@apollo/client'
import { ArrowLeft, ArrowUp, Inbox, Loader2, MessageCircle } from 'lucide-react'
import { GET_CONVERSATION, GET_MY_CONVERSATIONS, MESSAGE_SENT, SEND_MESSAGE } from '@/lib/gql'
import { useMe } from '@/hooks/useMe'
import { Button } from '@/components/ui/button'
import { MemberAvatar } from '@/components/ui/member-avatar'
import { Skeleton } from '@/components/ui/skeleton'

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

function conversationTitle(conversation: ConversationData, myId?: string) {
  const person = conversation.buyer.id === myId ? conversation.seller : conversation.buyer
  return person.fullName || 'CRITERIA member'
}

function conversationSubject(conversation: ConversationData) {
  return conversation.sellerPost?.title || conversation.buyerPost?.title || 'Conversation'
}

export default function InboxPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const client = useApolloClient()
  const { me } = useMe()
  const [draft, setDraft] = useState('')
  const [sendError, setSendError] = useState<string | null>(null)
  const messagesRef = useRef<HTMLDivElement>(null)
  const { data: listData, loading: listLoading, error: listError, refetch: refetchList } = useQuery<{ myConversations: ConversationData[] }>(GET_MY_CONVERSATIONS, { fetchPolicy: 'cache-and-network' })
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
  useEffect(() => {
    const panel = messagesRef.current
    if (panel) panel.scrollTop = panel.scrollHeight
  }, [conversation?.messages.length])

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    const body = draft.trim()
    if (!id || !body || sending) return
    setSendError(null)
    try {
      await sendMessage({ variables: { conversationId: id, body } })
      setDraft('')
      void Promise.allSettled([refetchDetail(), refetchList()])
    } catch (cause) {
      setSendError(cause instanceof Error ? cause.message : 'Message could not be sent. Try again.')
    }
  }

  return (
    <div className="workspace-content flex h-[calc(100dvh-128px-env(safe-area-inset-top)-env(safe-area-inset-bottom))] min-h-[400px] max-w-[1180px] flex-col px-4 pb-5 pt-5 md:h-auto md:px-8 md:py-8 lg:px-10">
      <div className="mb-6 shrink-0">
        <p className="editorial-kicker">Stay connected</p>
        <h1 className="editorial-title mt-1">Inbox</h1>
        <p className="editorial-subtitle mt-2 text-sm">Conversations about your listings and buyer requests.</p>
      </div>
      <div className="surface-panel grid min-h-0 flex-1 overflow-hidden md:min-h-[min(72dvh,760px)] md:grid-cols-[minmax(270px,320px)_minmax(0,1fr)] lg:h-[calc(100dvh-250px)] lg:min-h-[560px] lg:max-h-[820px]">
        <aside className={`${id ? 'hidden md:block' : 'block'} min-h-0 overflow-y-auto md:border-r md:border-border/70`} aria-label="Conversations">
          <div className="border-b border-border/70 px-5 py-4 text-sm font-semibold">Messages</div>
          {listLoading && !listData && <div role="status" aria-label="Loading conversations" className="space-y-1"><span className="sr-only">Loading conversations…</span>{Array.from({ length: 5 }, (_, index) => <div key={index} aria-hidden="true" className="flex gap-3 border-b border-border/70 px-5 py-4"><Skeleton className="h-10 w-10 shrink-0 rounded-full" /><div className="flex-1 space-y-2"><Skeleton className="h-4 w-3/4" /><Skeleton className="h-3 w-1/2" /></div></div>)}</div>}
          {listError && <div className="p-5 text-sm"><p role="alert" className="text-destructive">{listData ? 'Conversations may be out of date.' : 'Couldn’t load conversations.'}</p><button type="button" onClick={() => void refetchList()} className="mt-3 font-semibold text-primary underline">Retry</button></div>}
          {listData?.myConversations.length === 0 && <div className="p-7 text-center text-sm text-muted-foreground"><MessageCircle className="mx-auto mb-3 text-primary-400" aria-hidden="true" />Conversations will appear here after you contact another member.</div>}
          <div className="divide-y divide-border/70">
            {listData?.myConversations.map(item => {
              const last = item.messages.at(-1)
              const person = item.buyer.id === me?.id ? item.seller : item.buyer
              return <Link key={item.id} to={`/inbox/${item.id}`} className={`block px-5 py-4 transition-colors hover:bg-accent focus-visible:bg-accent ${item.id === id ? 'bg-primary-100/80' : ''}`} aria-current={item.id === id ? 'page' : undefined}>
                <div className="flex items-center gap-3">
                  <MemberAvatar member={person} className="h-10 w-10 text-sm" />
                  <span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold">{conversationTitle(item, me?.id)}</span><span className="block truncate text-xs text-muted-foreground">{conversationSubject(item)}</span></span>
                </div>
                {last && <p className="mt-2 truncate pl-[52px] text-xs text-muted-foreground">{last.body}</p>}
              </Link>
            })}
          </div>
        </aside>
        <section className={`${id ? 'flex' : 'hidden md:flex'} min-h-0 min-w-0 flex-col`} aria-label="Selected conversation">
          {!id ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center text-muted-foreground"><Inbox size={36} className="text-primary-400" aria-hidden="true" /><p className="text-sm">Select a conversation to read and reply.</p></div>
          ) : detailLoading && !conversation ? (
            <div role="status" aria-label="Loading messages" className="flex flex-1 flex-col gap-4 p-5 md:p-7"><span className="sr-only">Loading messages…</span><Skeleton className="h-12 w-3/5" /><Skeleton className="h-14 w-2/3 self-end" /><Skeleton className="h-14 w-1/2" /><Skeleton className="h-12 w-3/5 self-end" /></div>
          ) : !conversation ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center text-sm"><p role="alert">This conversation is unavailable.</p><Button variant="outline" onClick={() => navigate('/inbox')}>Back to Inbox</Button></div>
          ) : (
            <>
              <div className="flex items-center gap-3 border-b border-border/70 px-4 py-3 md:px-6">
                <button type="button" onClick={() => navigate('/inbox')} aria-label="Back to conversations" className="flex h-11 w-11 items-center justify-center rounded-full hover:bg-accent md:hidden"><ArrowLeft size={20} /></button>
                <MemberAvatar member={conversation.buyer.id === me?.id ? conversation.seller : conversation.buyer} className="h-10 w-10 text-sm" />
                <div className="min-w-0"><h2 className="truncate text-sm font-semibold">{conversationTitle(conversation, me?.id)}</h2><p className="truncate text-xs text-muted-foreground">{conversationSubject(conversation)}</p></div>
              </div>
              {detailError && <div className="border-b border-warning/30 bg-warning-muted px-4 py-2 text-sm text-warning-foreground">Messages may be out of date. <button type="button" onClick={() => void refetchDetail()} className="font-semibold underline">Retry</button></div>}
              <div ref={messagesRef} className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto bg-background/60 p-4 md:max-h-[55dvh] md:min-h-[280px] md:p-6 lg:max-h-none lg:min-h-0" aria-live="polite">
                {conversation.messages.length === 0 && <p className="my-auto text-center text-sm text-muted-foreground">Start the conversation with a helpful introduction.</p>}
                {conversation.messages.map(message => {
                  const own = message.sender.id === me?.id
                  return <div key={message.id} className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed lg:max-w-[640px] ${own ? 'self-end rounded-br-sm bg-primary text-white' : 'self-start rounded-bl-sm border border-border bg-surface text-foreground'}`}>
                    <p className="whitespace-pre-wrap break-words">{message.body}</p>
                    <time className={`mt-1 block text-[11px] ${own ? 'text-primary-200' : 'text-muted-foreground'}`} dateTime={message.createdAt}>{new Date(message.createdAt).toLocaleString('pt-PT', { dateStyle: 'short', timeStyle: 'short' })}</time>
                  </div>
                })}
              </div>
              <form onSubmit={submit} className="border-t border-border/70 bg-surface p-3 md:p-5">
                {sendError && <p role="alert" className="mb-2 text-sm text-destructive">{sendError}</p>}
                <div className="flex items-end gap-2">
                  <label htmlFor="message-body" className="sr-only">Message</label>
                  <textarea id="message-body" value={draft} onChange={event => setDraft(event.target.value)} maxLength={5000} rows={2} placeholder="Write a message…" className="min-h-12 flex-1 resize-y rounded-xl border border-border bg-surface px-4 py-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
                  <Button type="submit" size="icon" aria-label="Send message" disabled={!draft.trim() || sending} className="h-12 w-12 shrink-0">{sending ? <Loader2 size={18} className="animate-spin" /> : <ArrowUp size={18} />}</Button>
                </div>
              </form>
            </>
          )}
        </section>
      </div>
    </div>
  )
}
