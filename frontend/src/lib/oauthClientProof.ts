const STORAGE_KEY = 'criteria_oauth_client_verifier'

function base64url(bytes: Uint8Array): string {
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

/** Bind the server's short-lived OAuth exchange code to this browser session. */
export async function beginOAuthClientProof(): Promise<string> {
  const verifier = base64url(crypto.getRandomValues(new Uint8Array(32)))
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier))
  const challenge = base64url(new Uint8Array(digest))
  // Storage failure must stop the flow, or the callback could not prove that
  // it came back to the browser that initiated sign-in.
  sessionStorage.setItem(STORAGE_KEY, verifier)
  return challenge
}

export function takeOAuthClientVerifier(): string {
  const verifier = sessionStorage.getItem(STORAGE_KEY)
  sessionStorage.removeItem(STORAGE_KEY)
  if (!verifier) throw new Error('Google sign-in session was lost. Please try again.')
  return verifier
}
