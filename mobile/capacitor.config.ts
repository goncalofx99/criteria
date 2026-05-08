import type { CapacitorConfig } from '@capacitor/cli'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

/**
 * Per-machine dev settings, gitignored, optional.
 *
 * Create `mobile/dev.config.json` like:
 *   { "serverUrl": "http://192.168.x.x:5173" }   ← your default DEV URL
 *
 * The launcher (mobile/launcher/index.html) is ALWAYS the entry point. It shows
 * a PROD/DEV toggle:
 *   - PROD → loads the deployed webapp (PROD_URL constant in the launcher).
 *   - DEV  → user picks a URL from presets or types one.
 *
 * What this script does at sync time: injects `serverUrl` from dev.config.json
 * into the launcher's `DEFAULT_DEV_URL` constant so the DEV input is pre-filled.
 * Nothing else — the toggle UI lives entirely in the launcher.
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
        `var DEFAULT_DEV_URL = '${dev.serverUrl.replace(/\/$/, '')}'`,
      )
      if (updated !== html) {
        writeFileSync(launcherPath, updated)
        // eslint-disable-next-line no-console
        console.log(`[capacitor] Launcher DEV default set to: ${dev.serverUrl}`)
      }
    }
  } catch (e) {
    // eslint-disable-next-line no-console
    console.warn('[capacitor] Failed to read dev.config.json:', e)
  }
}

const config: CapacitorConfig = {
  appId: 'com.criteria.app',
  appName: 'CRITERIA',
  webDir: 'launcher',

  server: {
    // No `url` here on purpose — the launcher decides which URL to load at
    // runtime, so the user can switch between PROD and DEV without rebuilding.
    cleartext: true,
    allowNavigation: [
      '192.168.*.*',
      '10.*.*.*',
      '172.16.*.*',
      'localhost',
      '127.0.0.1',
      '*.vercel.app',
      '*.criteria.app',
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

export default config
