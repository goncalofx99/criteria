import { useEffect, useState } from 'react'
import { supabase } from './lib/supabase'
import { gql } from './lib/gql'
import { createClient } from 'graphql-ws'
import type { Session } from '@supabase/supabase-js'

// ─── Types ────────────────────────────────────────────────────────────────────

type Tab = 'posts' | 'match' | 'chat'

interface Post { id: string; title: string; locationText: string }
interface Message { id: string; body: string; sender: { id: string } }

// ─── App ─────────────────────────────────────────────────────────────────────

export default function App() {
  const [session, setSession] = useState<Session | null>(null)
  const [tab, setTab] = useState<Tab>('posts')
  const [log, setLog] = useState<string[]>([])

  const addLog = (msg: string) => setLog(p => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...p])

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session)
      if (session) {
        // Sync user to our DB on every login
        try {
          await gql(session.access_token, `
            mutation {
              upsertUser(input: {
                email: "${session.user.email}"
                fullName: "${session.user.user_metadata?.full_name ?? ''}"
                avatarUrl: "${session.user.user_metadata?.avatar_url ?? ''}"
                role: both
              }) { id email role }
            }
          `)
          addLog('✅ upsertUser — user synced to DB')
        } catch (e: unknown) {
          addLog(`❌ upsertUser failed: ${e instanceof Error ? e.message : String(e)}`)
        }
      }
    })
    return () => subscription.unsubscribe()
  }, [])

  if (!session) return <LoginScreen />

  const token = session.access_token
  const userId = session.user.id

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700 }}>CRITERIA <span className="tag">POC</span></h1>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <span style={{ fontSize: 13, color: '#aaa' }}>{session.user.email}</span>
          <button onClick={() => supabase.auth.signOut()}>Sign out</button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {(['posts', 'match', 'chat'] as Tab[]).map(t => (
          <button key={t} className={tab === t ? 'primary' : ''} onClick={() => setTab(t)}>
            {t === 'posts' ? '📝 Create Posts' : t === 'match' ? '🔍 Matching' : '💬 Chat'}
          </button>
        ))}
      </div>

      {tab === 'posts' && <PostsTab token={token} addLog={addLog} />}
      {tab === 'match' && <MatchTab token={token} addLog={addLog} />}
      {tab === 'chat' && <ChatTab token={token} userId={userId} addLog={addLog} />}

      {/* Log */}
      <div style={{ marginTop: 32 }}>
        <div style={{ fontSize: 13, color: '#aaa', marginBottom: 8, display: 'flex', justifyContent: 'space-between' }}>
          <span>Activity log</span>
          <button style={{ fontSize: 12, padding: '2px 8px' }} onClick={() => setLog([])}>clear</button>
        </div>
        <pre style={{ maxHeight: 200 }}>{log.join('\n') || 'Nothing yet...'}</pre>
      </div>
    </div>
  )
}

// ─── Login ────────────────────────────────────────────────────────────────────

function LoginScreen() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', gap: 16 }}>
      <h1 style={{ fontSize: 28, fontWeight: 700 }}>CRITERIA</h1>
      <p style={{ color: '#aaa', fontSize: 14 }}>POC — Backend test</p>
      <button className="primary" style={{ padding: '12px 24px', fontSize: 15 }}
        onClick={() => supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.origin } })}>
        Sign in with Google
      </button>
    </div>
  )
}

// ─── Posts Tab ────────────────────────────────────────────────────────────────

function PostsTab({ token, addLog }: { token: string; addLog: (m: string) => void }) {
  const [result, setResult] = useState<string>('')

  async function createSeller() {
    try {
      const data = await gql(token, `
        mutation {
          createSellerPost(input: {
            title: "Beautiful 3-bed apartment in Lisbon"
            description: "Sunny flat near the river"
            locationText: "Lisbon, Portugal"
            lat: 38.7169
            lng: -9.1399
            propertyType: apartment
            price: 350000
            bedrooms: 3
            bathrooms: 2
            areaSqm: 95
            images: []
          }) { id title price }
        }
      `)
      setResult(JSON.stringify(data, null, 2))
      addLog(`✅ createSellerPost — ${data.createSellerPost.id}`)
    } catch (e: unknown) {
      addLog(`❌ createSellerPost: ${e instanceof Error ? e.message : String(e)}`)
    }
  }

  async function createBuyer() {
    try {
      const data = await gql(token, `
        mutation {
          createBuyerPost(input: {
            title: "Looking for apartment in Lisbon"
            description: "Budget flexible for the right place"
            locationText: "Lisbon, Portugal"
            lat: 38.7169
            lng: -9.1399
            radiusKm: 10
            propertyType: apartment
            priceMin: 200000
            priceMax: 500000
            bedroomsMin: 2
            bathroomsMin: 1
          }) { id title priceMin priceMax }
        }
      `)
      setResult(JSON.stringify(data, null, 2))
      addLog(`✅ createBuyerPost — ${data.createBuyerPost.id}`)
    } catch (e: unknown) {
      addLog(`❌ createBuyerPost: ${e instanceof Error ? e.message : String(e)}`)
    }
  }

  async function fetchMyPosts() {
    try {
      const data = await gql(token, `
        query {
          mySellerPosts { id title price isActive createdAt }
          myBuyerPosts { id title priceMin priceMax isActive createdAt }
        }
      `)
      setResult(JSON.stringify(data, null, 2))
      addLog(`✅ mySellerPosts: ${data.mySellerPosts.length} | myBuyerPosts: ${data.myBuyerPosts.length}`)
    } catch (e: unknown) {
      addLog(`❌ myPosts: ${e instanceof Error ? e.message : String(e)}`)
    }
  }

  return (
    <div className="card section">
      <h2 style={{ fontSize: 16, marginBottom: 16 }}>Create & fetch posts</h2>
      <div className="row" style={{ marginBottom: 16 }}>
        <button className="primary" onClick={createSeller}>Create seller post</button>
        <button className="primary" onClick={createBuyer}>Create buyer post</button>
        <button onClick={fetchMyPosts}>My posts</button>
      </div>
      {result && <pre>{result}</pre>}
    </div>
  )
}

// ─── Match Tab ────────────────────────────────────────────────────────────────

function MatchTab({ token, addLog }: { token: string; addLog: (m: string) => void }) {
  const [postId, setPostId] = useState('')
  const [direction, setDirection] = useState<'seller' | 'buyer'>('seller')
  const [results, setResults] = useState<Post[]>([])

  async function runMatch() {
    if (!postId.trim()) return
    try {
      const query = direction === 'seller'
        ? `query($id: ID!) { matchingBuyerPosts(sellerPostId: $id) { id title locationText } }`
        : `query($id: ID!) { matchingSellerPosts(buyerPostId: $id) { id title locationText } }`
      const data = await gql(token, query, { id: postId.trim() })
      const matches = direction === 'seller' ? data.matchingBuyerPosts : data.matchingSellerPosts
      setResults(matches)
      addLog(`✅ matching — found ${matches.length} results`)
    } catch (e: unknown) {
      addLog(`❌ matching: ${e instanceof Error ? e.message : String(e)}`)
    }
  }

  return (
    <div className="card section">
      <h2 style={{ fontSize: 16, marginBottom: 16 }}>Bidirectional matching</h2>
      <div className="row" style={{ marginBottom: 12 }}>
        <div className="field">
          <label>Direction</label>
          <select value={direction} onChange={e => setDirection(e.target.value as 'seller' | 'buyer')}>
            <option value="seller">Seller post → matching buyers</option>
            <option value="buyer">Buyer post → matching sellers</option>
          </select>
        </div>
        <div className="field">
          <label>Post ID</label>
          <input placeholder="paste a post UUID" value={postId} onChange={e => setPostId(e.target.value)} />
        </div>
        <div className="field" style={{ justifyContent: 'flex-end' }}>
          <button className="primary" onClick={runMatch}>Run match</button>
        </div>
      </div>
      {results.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {results.map(p => (
            <div key={p.id} style={{ padding: '10px 14px', background: '#111', borderRadius: 6, border: '1px solid #222' }}>
              <div style={{ fontWeight: 600 }}>{p.title}</div>
              <div style={{ fontSize: 12, color: '#aaa' }}>{p.locationText} · {p.id}</div>
            </div>
          ))}
        </div>
      )}
      {results.length === 0 && <p style={{ color: '#555', fontSize: 13 }}>No matches yet — create posts first, then paste a post ID here.</p>}
    </div>
  )
}

// ─── Chat Tab ─────────────────────────────────────────────────────────────────

function ChatTab({ token, userId, addLog }: { token: string; userId: string; addLog: (m: string) => void }) {
  const [postId, setPostId] = useState('')
  const [postType, setPostType] = useState<'seller' | 'buyer'>('seller')
  const [convId, setConvId] = useState('')
  const [messages, setMessages] = useState<Message[]>([])
  const [draft, setDraft] = useState('')
  const [wsClient, setWsClient] = useState<ReturnType<typeof createClient> | null>(null)

  async function startConv() {
    if (!postId.trim()) return
    try {
      const input = postType === 'seller' ? `sellerPostId: "${postId.trim()}"` : `buyerPostId: "${postId.trim()}"`
      const data = await gql(token, `
        mutation {
          startConversation(input: { ${input} }) {
            id
            messages { id body sender { id } }
          }
        }
      `)
      const conv = data.startConversation
      setConvId(conv.id)
      setMessages(conv.messages)
      addLog(`✅ startConversation — ${conv.id}`)
      subscribeToMessages(conv.id)
    } catch (e: unknown) {
      addLog(`❌ startConversation: ${e instanceof Error ? e.message : String(e)}`)
    }
  }

  function subscribeToMessages(cid: string) {
    const client = createClient({
      url: 'wss://criteria-newn.onrender.com/graphql',
      connectionParams: { authorization: `Bearer ${token}` },
    })
    setWsClient(client)

    client.subscribe(
      { query: `subscription { messageSent(conversationId: "${cid}") { id body sender { id } } }` },
      {
        next: ({ data }) => {
          if (data?.messageSent) {
            setMessages((p: Message[]) => [...p, data.messageSent as Message])
            addLog(`📨 messageSent subscription fired`)
          }
        },
        error: (e) => addLog(`❌ subscription error: ${String(e)}`),
        complete: () => addLog('subscription closed'),
      }
    )
  }

  async function send() {
    if (!draft.trim() || !convId) return
    try {
      await gql(token, `
        mutation($cid: ID!, $body: String!) {
          sendMessage(conversationId: $cid, body: $body) { id body }
        }
      `, { cid: convId, body: draft.trim() })
      setDraft('')
    } catch (e: unknown) {
      addLog(`❌ sendMessage: ${e instanceof Error ? e.message : String(e)}`)
    }
  }

  useEffect(() => () => { wsClient?.dispose() }, [wsClient])

  return (
    <div className="card section">
      <h2 style={{ fontSize: 16, marginBottom: 16 }}>Conversations & real-time chat</h2>

      {!convId ? (
        <div className="row" style={{ marginBottom: 12 }}>
          <div className="field">
            <label>Reach out via</label>
            <select value={postType} onChange={e => setPostType(e.target.value as 'seller' | 'buyer')}>
              <option value="seller">Seller post (you're a buyer)</option>
              <option value="buyer">Buyer post (you're a seller)</option>
            </select>
          </div>
          <div className="field">
            <label>Post ID</label>
            <input placeholder="paste a post UUID" value={postId} onChange={e => setPostId(e.target.value)} />
          </div>
          <div className="field" style={{ justifyContent: 'flex-end' }}>
            <button className="primary" onClick={startConv}>Start conversation</button>
          </div>
        </div>
      ) : (
        <>
          <div style={{ fontSize: 12, color: '#aaa', marginBottom: 10 }}>
            Conversation <span style={{ color: '#60a5fa' }}>{convId}</span>
            <button style={{ marginLeft: 10, fontSize: 12, padding: '2px 8px' }} onClick={() => { setConvId(''); setMessages([]); wsClient?.dispose() }}>close</button>
          </div>
          <div className="messages">
            {messages.length === 0 && <span style={{ color: '#555', fontSize: 13 }}>No messages yet</span>}
            {messages.map(m => (
              <div key={m.id} className={`msg ${m.sender.id === userId ? 'mine' : 'theirs'}`}>
                <span style={{ fontSize: 14 }}>{m.body}</span>
              </div>
            ))}
          </div>
          <div className="row" style={{ marginTop: 10 }}>
            <input
              placeholder="Type a message..."
              value={draft}
              onChange={e => setDraft(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && send()}
            />
            <button className="primary" onClick={send}>Send</button>
          </div>
        </>
      )}
    </div>
  )
}
