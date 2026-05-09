import 'dotenv/config'
import './lib/env.js' // validates env vars — exits immediately if misconfigured
import { ApolloServer, HeaderMap } from '@apollo/server'
import { makeExecutableSchema } from '@graphql-tools/schema'
import { WebSocketServer } from 'ws'
import { useServer } from 'graphql-ws/use/ws'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { secureHeaders } from 'hono/secure-headers'
import { serve } from '@hono/node-server'
import type { Server } from 'http'
import { env } from './lib/env.js'
import { db } from './db/index.js'
import { authMiddleware, verifyJwt } from './middleware/auth.js'
import { rateLimitMiddleware } from './middleware/rateLimit.js'
import { typeDefs } from './schema/typeDefs.js'
import { resolvers } from './schema/resolvers/index.js'
import { createLoaders } from './lib/dataloaders.js'
import { authRoutes } from './routes/auth.js'
import { uploadRoutes } from './routes/upload.js'
import type { Context } from './context.js'

// ─── Executable schema (shared between Apollo HTTP and graphql-ws) ─────────────

const schema = makeExecutableSchema({ typeDefs, resolvers })

// ─── Apollo Server ────────────────────────────────────────────────────────────

const apollo = new ApolloServer<Context>({
  schema,

  // Introspection exposes your full schema to anyone — disable in production.
  introspection: env.NODE_ENV !== 'production',

  // Mask unexpected errors in production so internal details never leak.
  // Known error codes (UNAUTHENTICATED, FORBIDDEN, etc.) are passed through.
  formatError: (formattedError, error) => {
    if (env.NODE_ENV === 'production') {
      const safeCode = formattedError.extensions?.code as string | undefined
      const safeCodes = ['UNAUTHENTICATED', 'FORBIDDEN', 'NOT_FOUND', 'BAD_USER_INPUT']
      if (!safeCode || !safeCodes.includes(safeCode)) {
        console.error('[GraphQL] Masked error:', error)
        return {
          message: 'Internal server error',
          extensions: { code: 'INTERNAL_SERVER_ERROR' },
        }
      }
    }
    return formattedError
  },
})

await apollo.start()

// ─── Hono App ─────────────────────────────────────────────────────────────────

const app = new Hono<{ Variables: { userId: string | null } }>()

// Security headers (X-Content-Type-Options, X-Frame-Options, HSTS, etc.)
app.use('*', secureHeaders())

// CORS — lock down to the frontend origin in production
app.use(
  '*',
  cors({
    origin:
      env.NODE_ENV === 'production' && env.FRONTEND_URL
        ? (origin) => {
            // Allow the configured frontend URL and its www variant
            const base = env.FRONTEND_URL!
            const allowed = [base, base.replace('https://', 'https://www.')]
            return allowed.includes(origin) ? origin : null
          }
        : '*',
    allowMethods: ['GET', 'POST', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
    maxAge: 86400,
  })
)

// Rate limiting — 60 req/min per IP in production, 500 in development
app.use('*', rateLimitMiddleware)

// JWT auth — sets userId on context (null if unauthenticated)
app.use('*', authMiddleware)

// ─── REST Routes ──────────────────────────────────────────────────────────────

// Auth routes (signup, signin, google oauth, refresh, signout)
app.route('/', authRoutes)

// Upload routes (presigned URLs for R2)
app.route('/', uploadRoutes)

// Health check
app.get('/health', (c) => c.json({ status: 'ok' }))

// ─── GraphQL ──────────────────────────────────────────────────────────────────

app.on(['GET', 'POST'], '/graphql', async (c) => {
  let body = {}
  if (c.req.method === 'POST') {
    try {
      body = await c.req.json()
    } catch {
      return c.json({ errors: [{ message: 'Invalid JSON in request body' }] }, 400)
    }
  }

  const headers = new HeaderMap()
  c.req.raw.headers.forEach((value, key) => headers.set(key, value))

  const result = await apollo.executeHTTPGraphQLRequest({
    httpGraphQLRequest: {
      method: c.req.method,
      headers,
      search: new URL(c.req.url).search ?? '',
      body,
    },
    context: async () => ({ db, userId: c.get('userId'), loaders: createLoaders(db) }),
  })

  if (result.body.kind !== 'complete') {
    return c.json({ errors: [{ message: 'Unexpected streaming response' }] }, 500)
  }

  const status = (result.status ?? 200) as number
  return new Response(result.body.string, {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...Object.fromEntries(result.headers),
    },
  })
})

// ─── Start HTTP + WebSocket servers ──────────────────────────────────────────

// serve() returns ServerType which includes Http2Server — cast to http.Server
// since we know @hono/node-server uses plain HTTP by default.
const httpServer = serve({ fetch: app.fetch, port: env.PORT }) as unknown as Server

// Attach a WebSocket server to the same HTTP server for GraphQL subscriptions.
// The client sends the auth token in connectionParams.authorization.
const wss = new WebSocketServer({ server: httpServer })

useServer(
  {
    schema,
    context: async (wsCtx) => {
      const authHeader = wsCtx.connectionParams?.authorization as string | undefined
      let userId: string | null = null
      if (authHeader?.startsWith('Bearer ')) {
        userId = await verifyJwt(authHeader.slice(7))
      }
      return { db, userId, loaders: createLoaders(db) }
    },
  },
  wss
)

console.log(`Server ready at http://localhost:${env.PORT}/graphql`)
console.log(`  WebSocket subscriptions at ws://localhost:${env.PORT}/graphql`)
console.log(`  Auth endpoints at http://localhost:${env.PORT}/auth/*`)
console.log(`  Upload endpoint at http://localhost:${env.PORT}/upload/presign`)
if (env.NODE_ENV === 'development') {
  console.log(`  Apollo Sandbox: http://localhost:${env.PORT}/graphql`)
}
