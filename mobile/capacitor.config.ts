import type { CapacitorConfig } from '@capacitor/cli'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

/**
 * Per-machine dev settings, gitignored, optional.
 *
 * Create `mobile/dev.config.json` like:
 * { "serverUrl": "http://localhost:5173" }
 *
 * The URL is injected into `launcher/index.html` at sync time as the default
 * value the launcher will pre-fill (and auto-connect to). The launcher
 * pre-flights the URL with a HEAD request before redirecting, so when Vite
 * isn't up the user sees a clear error instead of a blank screen.
 *
 * The launcher also persists whatever URL you last typed into localStorage.
 */
interface DevConfig {
  serverUrl?: string
}

const launcherPath = join(__dirname, 'launcher', 'index.html')
const devPath = join(__dirname, 'dev.config.json')

if (existsSync(devPath) && existsSync(launcherPath)) {
  try {
    const dev = JSON.parse(readFileSync(devPath, 'utf-8')) as DevConfig
    if (dev.serverUrl) {
      const html = readFileSync(launcherPath, 'utf-8')
      const updated = html.replace(
        /var DEFAULT_DEV_URL = '[^']*'/,
        `var DEFAULT_DEV_URL = '${dev.serverUrl}'`
      )
      if (updated !== html) {
        writeFileSync(launcherPath, updated)
        // eslint-disable-next-line no-console
        console.log(`[capacitor] Launcher default URL set to: ${dev.serverUrl}`)
      }
    }
  } catch (e) {
    // eslint-disable-next-line no-console
    console.warn('[capacitor] Failed to apply dev.config.json:', e)
  }
}

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
      '*.criteria.app',
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

export default config
