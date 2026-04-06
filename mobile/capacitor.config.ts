import { CapacitorConfig } from '@capacitor/cli'

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
