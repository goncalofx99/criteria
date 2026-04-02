import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.criteria.app',
  appName: 'CRITERIA',
  // Points to the frontend Vite build output
  webDir: '../frontend/dist',
  server: {
    // Allow cleartext HTTP in dev (remove for production builds)
    cleartext: true,
  },
}

export default config
