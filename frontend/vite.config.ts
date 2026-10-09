import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig(({ command, mode }) => {
  if (command === 'build') {
    const variables = loadEnv(mode, __dirname, 'VITE_')
    for (const [key, protocol] of [
      ['VITE_API_URL', 'https:'],
      ['VITE_GRAPHQL_URL', 'https:'],
      ['VITE_GRAPHQL_WS_URL', 'wss:'],
    ] as const) {
      const value = variables[key]
      if (!value || !URL.canParse(value) || new URL(value).protocol !== protocol) {
        throw new Error(`${key} must use ${protocol === 'wss:' ? 'WSS' : 'HTTPS'} for production builds`)
      }
    }
  }

  return {
    plugins: [react()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
  }
})
