import 'dotenv/config'
import { ApolloServer, HeaderMap } from '@apollo/server'
import { Hono } from 'hono'
import { serve } from '@hono/node-server'
import { db } from './db/index.js'
import { authMiddleware } from './middleware/auth.js'
import { typeDefs } from './schema/typeDefs.js'
import { resolvers } from './schema/resolvers/index.js'
import type { Context } from './context.js'

const apollo = new ApolloServer<Context>({ typeDefs, resolvers })
await apollo.start()

const app = new Hono<{ Variables: { userId: string | null } }>()

app.use('*', authMiddleware)

app.get('/health', (c) => c.json({ status: 'ok' }))

app.on(['GET', 'POST'], '/graphql', async (c) => {
  const body = c.req.method === 'POST' ? await c.req.json() : {}

  const headers = new HeaderMap()
  c.req.raw.headers.forEach((value, key) => headers.set(key, value))

  const result = await apollo.executeHTTPGraphQLRequest({
    httpGraphQLRequest: {
      method: c.req.method,
      headers,
      search: new URL(c.req.url).search ?? '',
      body,
    },
    context: async () => ({ db, userId: c.get('userId') }),
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

const port = Number(process.env.PORT ?? 4000)
serve({ fetch: app.fetch, port })
console.log(`🚀 Server ready at http://localhost:${port}/graphql`)
