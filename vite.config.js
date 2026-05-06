import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import apiPlugin from './server/vitePluginApi.js'

// Variables we want available to the server-side middleware via
// `process.env`. Vite normally only exposes VITE_-prefixed vars to the
// client; for our /api/correct endpoint we read them server-side, so we
// load .env / .env.local manually and copy them onto process.env.
const SERVER_ENV_KEYS = [
  'CLAUDE_CODE_OAUTH_TOKEN',
  'ANTHROPIC_API_KEY',
  'CLAUDE_MODEL',
]

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  for (const key of SERVER_ENV_KEYS) {
    if (env[key] && !process.env[key]) process.env[key] = env[key]
  }
  return {
    plugins: [vue(), apiPlugin()],
  }
})
