import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ApolloProvider } from '@apollo/client'
import { Capacitor } from '@capacitor/core'
import { apolloClient } from '@/lib/apollo'
import App from './App'
import './index.css'

// Tag the document so CSS can branch on native vs browser. Used by `app-shell`
// to keep the mobile column on native (Capacitor wrapper) but go full-width
// in a desktop browser.
if (Capacitor.isNativePlatform()) {
  document.documentElement.classList.add('native')

  // Clear the launcher's error marker — we loaded successfully.
  try { localStorage.removeItem('criteria_last_error') } catch (_) { /* noop */ }

  // Escape hatch: triple-tap the top 44px of the screen to return to the
  // Capacitor launcher. This lets you switch between PROD/DEV or recover from
  // a broken state without rebuilding in Xcode.
  let tapCount = 0
  let tapTimer: ReturnType<typeof setTimeout> | null = null
  document.addEventListener('click', (e) => {
    if (e.clientY > 44) { tapCount = 0; return }
    tapCount++
    if (tapTimer) clearTimeout(tapTimer)
    if (tapCount >= 3) {
      tapCount = 0
      window.location.href = 'capacitor://localhost/index.html'
    } else {
      tapTimer = setTimeout(() => { tapCount = 0 }, 600)
    }
  })
} else {
  document.documentElement.classList.add('web')
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ApolloProvider client={apolloClient}>
      <App />
    </ApolloProvider>
  </StrictMode>,
)
