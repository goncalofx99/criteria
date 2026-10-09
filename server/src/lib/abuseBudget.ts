// Per-process budgets give a single API instance a basic backstop against
// automated bursts. Move this state to a shared store before scaling out.
const requests = new Map<string, { count: number; resetAt: number }>()

export function consumeAbuseBudget(key: string, max: number, windowMs: number, now = Date.now()): number {
  const entry = requests.get(key)
  if (!entry || now >= entry.resetAt) {
    requests.set(key, { count: 1, resetAt: now + windowMs })
    return 0
  }
  if (entry.count >= max) return Math.ceil((entry.resetAt - now) / 1000)
  entry.count++
  return 0
}

const cleanup = setInterval(() => {
  const now = Date.now()
  for (const [key, entry] of requests) {
    if (now >= entry.resetAt) requests.delete(key)
  }
}, 60_000)
cleanup.unref()
