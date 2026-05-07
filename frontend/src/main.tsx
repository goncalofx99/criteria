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
