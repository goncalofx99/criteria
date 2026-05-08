import type { CapacitorConfig } from '@capacitor/cli'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

/**
 * Per-machine dev settings, gitignored, optional.
 *
 * Create `mobile/dev.config.json` like:
 *   { "serverUrl": "http://192.168.x.x:5173" }   ← your default DEV URL
 *
 * On iOS the launcher handles the URL switching at runtime.
 * On Android we use Capacitor's `server.url` from dev.config.json so the native
 * bridge stays alive (required for OAuth deep links + plugins to work).
 */
interface DevConfig {
  serverUrl?: string
}

const launcherPath = join(__dirname, 'launcher', 'index.html')
const devPath = join(__dirname, 'dev.config.json')

let androidServerUrl: string | undefined

if (existsSync(devPath)) {
  try {
    const dev = JSON.parse(readFileSync(devPath, 'utf-8')) as DevConfig
    if (dev.serverUrl) {
      androidServerUrl = dev.serverUrl.replace(/\/$/, '')

      // Also inject into the launcher for iOS
      if (existsSync(launcherPath)) {
        const html = readFileSync(launcherPath, 'utf-8')
        const updated = html.replace(
          /var DEFAULT_DEV_URL = '[^']*'/,
          `var DEFAULT_DEV_URL = '${androidServerUrl}'`,
        )
        if (updated !== html) {
          writeFileSync(launcherPath, updated)
          // eslint-disable-next-line no-console
          console.log(`[capacitor] Launcher DEV default set to: ${androidServerUrl}`)
        }
      }
    }
  } catch (e) {
    // eslint-disable-next-line no-console
    console.warn('[capacitor] Failed to read dev.config.json:', e)
  }
}

const PROD_URL = 'https://criteria-app.com'

const config: CapacitorConfig = {
  appId: 'com.criteria.app',
  appName: 'CRITERIA',
  webDir: 'launcher',

  server: {
    cleartext: true,
    allowNavigation: [
      '192.168.*.*',
      '10.*.*.*',
      '172.16.*.*',
      'localhost',
      '127.0.0.1',
      '*.vercel.app',
      'criteria-app.com',
      '*.criteria-app.com',
      // Map tiles + geocoding
      'tile.openstreetmap.org',
      '*.tile.openstreetmap.org',
      'nominatim.openstreetmap.org',
    ],
  },

  ios: {
    contentInset: 'never',
    allowsLinkPreview: false,
    backgroundColor: '#fafaf8',
  },

  android: {
    allowMixedContent: true,
    captureInput: true,
  },
}

// Android: use server.url so the native bridge stays alive (required for
// OAuth deep links and Capacitor plugins). In dev, reads from dev.config.json;
// otherwise uses the production URL.
if (androidServerUrl) {
  config.server!.url = androidServerUrl
} else {
  config.server!.url = PROD_URL
}

export default config
