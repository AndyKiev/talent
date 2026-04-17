import { defineConfig, loadEnv, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import { tanstackRouter } from '@tanstack/router-plugin/vite'

export default (mode: string) => {
  const env = loadEnv(mode, process.cwd(), '')
  return defineConfig({
    plugins: [
      tanstackRouter({
        target: 'react',
        autoCodeSplitting: true,
      }) as unknown as Plugin,
      react(),
    ] as Plugin[],
    server: {
      port: 4002,
      host: '0.0.0.0',
      proxy: {
        '/api': {
          target: env.VITE_BACKEND_API_URL,
          changeOrigin: true,
          secure: false,
          rewrite: path => path.replace(/^\/api/, ''),
        },
      },
    },
  })
}