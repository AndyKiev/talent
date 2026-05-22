import { defineConfig, loadEnv } from 'vite'
import { tanstackRouter } from '@tanstack/router-plugin/vite'

export default (mode:string) => {
  const env = loadEnv(mode, process.cwd(), '')
  return defineConfig({
    plugins: [
      tanstackRouter({
        target: 'react',
        autoCodeSplitting: true,
      }),
    ],
    server: {
      port: 4004,
      host: '0.0.0.0',
      proxy: {
        "/api": {
          target: env.VITE_BACKEND_API_URL,
          changeOrigin: true,
          secure: false,
          rewrite: path => path.replace(/^\/api/, '')
        }
      }
    },
  })
}

// import { defineConfig } from 'vite'
// import react from '@vitejs/plugin-react'
// import { tanstackRouter } from '@tanstack/router-plugin/vite'
//
// export default defineConfig({
//   plugins: [
//     tanstackRouter({
//       target: 'react',
//       autoCodeSplitting: true,
//     }),
//     react(),
//   ],
// })