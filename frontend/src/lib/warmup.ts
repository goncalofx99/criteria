/**
 * Fire-and-forget ping to the GraphQL endpoint to wake up the backend.
 * Useful on auth pages — by the time the user finishes typing/OAuthing,
 * a sleeping Railway container has had a head-start at booting.
 */
let warmedAt = 0

export function warmUpBackend(): void {
  // Don't spam — once every 30s is plenty.
  if (Date.now() - warmedAt < 30_000) return
  warmedAt = Date.now()

  const url = import.meta.env.VITE_GRAPHQL_URL
  if (!url) return

  fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: '{ __typename }' }),
    keepalive: true,
  }).catch(() => {
    // Silent — this is just a warm-up.
  })
}
