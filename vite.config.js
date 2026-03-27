import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const supabaseUrl = env.VITE_SUPABASE_URL

  return {
    plugins: [react()],
    server: {
      port: 3000,
      open: true,
      strictPort: true,
      host: true,
      origin: 'http://localhost:3000',
      cors: true,
      // Proxy DEV: evita CORS del navegador (Safari/extensions) contra *.supabase.co
      ...(supabaseUrl
        ? {
            proxy: {
              '/supabase': {
                target: supabaseUrl,
                changeOrigin: true,
                secure: true,
                rewrite: (path) => path.replace(/^\/supabase/, '')
              }
            }
          }
        : {})
    },
    build: {
      chunkSizeWarningLimit: 1000
    }
  }
})