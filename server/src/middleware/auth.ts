import { createMiddleware } from 'hono/factory'
import { jwtVerify } from 'jose'

type Variables = { userId: string | null }

// Shared JWT verification — used by both the HTTP middleware and the WS subscription context.
export async function verifyJwt(token: string): Promise<string | null> {
  try {
    const secret = new TextEncoder().encode(process.env.SUPABASE_JWT_SECRET)
    const { payload } = await jwtVerify(token, secret)
    return (payload.sub as string) ?? null
  } catch {
    return null
  }
}

// Verifies the Supabase-issued JWT locally using the project's JWT secret.
// Sets userId in Hono context — null when no valid token is present.
// Resolvers are responsible for throwing if authentication is required.
export const authMiddleware = createMiddleware<{ Variables: Variables }>(
  async (c, next) => {
    const authHeader = c.req.header('Authorization')

    if (!authHeader?.startsWith('Bearer ')) {
      c.set('userId', null)
      return next()
    }

    c.set('userId', await verifyJwt(authHeader.slice(7)))
    return next()
  }
)
