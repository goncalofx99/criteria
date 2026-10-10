import 'dotenv/config'
import './lib/env.js' // validates env vars — exits immediately if misconfigured
import { ApolloServer, HeaderMap } from '@apollo/server'
import { makeExecutableSchema } from '@graphql-tools/schema'
import { WebSocketServer } from 'ws'
import { useServer } from 'graphql-ws/use/ws'
import { GraphQLError, specifiedRules, validate } from 'graphql'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { secureHeaders } from 'hono/secure-headers'
import { bodyLimit } from 'hono/body-limit'
import { serve } from '@hono/node-server'
import type { Server } from 'http'
import { env } from './lib/env.js'
import { db } from './db/index.js'
import { authMiddleware, verifyJwt } from './middleware/auth.js'
import { rateLimitMiddleware, sensitiveRateLimitMiddleware } from './middleware/rateLimit.js'
import { typeDefs } from './schema/typeDefs.js'
import { resolvers } from './schema/resolvers/index.js'
import { createLoaders } from './lib/dataloaders.js'
import { authRoutes } from './routes/auth.js'
import { accountRoutes } from './routes/account.js'
import { uploadRoutes } from './routes/upload.js'
import { startAccountDeletionCleanup } from './lib/accountDeletion.js'
import { maskWebSocketError, subscriptionOperationError } from './lib/wsPolicy.js'
import { queryLimitsRule } from './lib/queryLimits.js'
import type { Context } from './context.js'

// ─── Executable schema (shared between Apollo HTTP and graphql-ws) ─────────────

const schema = makeExecutableSchema({ typeDefs, resolvers })

// ─── Apollo Server ────────────────────────────────────────────────────────────

const apollo = new ApolloServer<Context>({
  schema,
  validationRules: [queryLimitsRule],

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

function allowedFrontendOrigin(origin: string | undefined): boolean {
  if (env.NODE_ENV !== 'production') return true
  if (!origin || !env.FRONTEND_URL) return false
  const configured = new URL(env.FRONTEND_URL)
  const bareHost = configured.hostname.replace(/^www\./, '')
  return [bareHost, `www.${bareHost}`].some((host) => {
    const allowed = new URL(configured.origin)
    allowed.hostname = host
    return origin === allowed.origin
  })
}

function websocketToken(params: Record<string, unknown> | undefined): string | null {
  const header = params?.authorization ?? params?.Authorization
  return typeof header === 'string' && header.startsWith('Bearer ') ? header.slice(7) : null
}

const app = new Hono<{ Variables: { userId: string | null } }>()

// Security headers (X-Content-Type-Options, X-Frame-Options, HSTS, etc.)
app.use('*', secureHeaders())
app.use('*', bodyLimit({ maxSize: 64 * 1024 }))

// CORS — lock down to the frontend origin in production
app.use(
  '*',
  cors({
    origin:
      env.NODE_ENV === 'production' && env.FRONTEND_URL
        ? (origin) => allowedFrontendOrigin(origin) ? origin : null
        : '*',
    allowMethods: ['GET', 'POST', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
    maxAge: 86400,
  })
)

// Rate limiting — 60 req/min per IP in production, 500 in development
app.use('*', rateLimitMiddleware)
app.use('*', sensitiveRateLimitMiddleware)

// JWT auth — sets userId on context (null if unauthenticated)
app.use('*', authMiddleware)

// ─── REST Routes ──────────────────────────────────────────────────────────────

// Auth routes (signup, signin, google oauth, refresh, signout)
app.route('/', authRoutes)
app.route('/', accountRoutes)

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
startAccountDeletionCleanup()

// Attach a WebSocket server to the same HTTP server for GraphQL subscriptions.
// The client sends the auth token in connectionParams.authorization.
const MAX_WS_CONNECTIONS = 500
const MAX_WS_CONNECTIONS_PER_USER = 5
const activeSocketsByUser = new Map<string, number>()
const wss = new WebSocketServer({
  server: httpServer,
  path: '/graphql',
  maxPayload: 64 * 1024,
  verifyClient: ({ origin }: { origin?: string }) =>
    allowedFrontendOrigin(origin) && wss.clients.size < MAX_WS_CONNECTIONS,
})

useServer(
  {
    schema,
    onConnect: async (wsCtx) => {
      const token = websocketToken(wsCtx.connectionParams)
      const userId = token ? await verifyJwt(token) : null
      if (!userId) return false
      const count = activeSocketsByUser.get(userId) ?? 0
      if (count >= MAX_WS_CONNECTIONS_PER_USER) return false
      activeSocketsByUser.set(userId, count + 1)
      wsCtx.extra.socket.once('close', () => {
        const remaining = (activeSocketsByUser.get(userId) ?? 1) - 1
        if (remaining > 0) activeSocketsByUser.set(userId, remaining)
        else activeSocketsByUser.delete(userId)
      })
      return true
    },
    onSubscribe: (wsCtx, _id, payload) => {
      if (Object.keys(wsCtx.subscriptions).length >= 10) {
        return [new GraphQLError('Too many active subscriptions', { extensions: { code: 'BAD_USER_INPUT' } })]
      }
      const error = subscriptionOperationError(payload.query, payload.operationName)
      return error ? [error] : undefined
    },
    validate: (schemaToValidate, document) =>
      validate(schemaToValidate, document, [...specifiedRules, queryLimitsRule]),
    onError: (_wsCtx, _id, _payload, errors) =>
      errors.map((error) => maskWebSocketError(error, env.NODE_ENV === 'production')),
    onNext: (_wsCtx, _id, _payload, _args, result) =>
      result.errors ? {
        ...result,
        errors: result.errors.map((error) => maskWebSocketError(error, env.NODE_ENV === 'production')),
      } : undefined,
    context: async (wsCtx) => {
      const authToken = websocketToken(wsCtx.connectionParams)
      let userId: string | null = null
      if (authToken) {
        userId = await verifyJwt(authToken)
      }
      return {
        db,
        userId,
        revalidateAuth: () => authToken ? verifyJwt(authToken) : Promise.resolve(null),
        loaders: createLoaders(db),
      }
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
