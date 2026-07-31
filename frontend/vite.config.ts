import { defineConfig, loadEnv } from 'vite'
import type { ConfigEnv, Plugin, ViteDevServer } from 'vite'
import { tanstackRouter } from '@tanstack/router-plugin/vite'

const PORT = 4004

// Vite refuses any request whose Host header it does not recognise (403
// "Blocked request. This host is not allowed."). Localhost and bare IPs are
// always allowed, so this list only has to carry NAMES.
const allowedHosts = (raw: string): string[] =>
  raw.split(',').map((h) => h.trim()).filter(Boolean)

// Vite prints one URL per network interface (corporate LAN, home wifi, the
// Docker/WSL virtual adapter that no other device can reach) which leaves it
// ambiguous which one to open on a phone. Print the canonical one last.
const canonicalUrlBanner = (host: string): Plugin => ({
  name: 'talent:canonical-url-banner',
  configureServer(server: ViteDevServer) {
    const printUrls = server.printUrls.bind(server)
    server.printUrls = () => {
      printUrls()
      if (host) {
        server.config.logger.info(
          `  >  All devices (phone / tablet / PC):  http://${host}:${PORT}/`
        )
      }
    }
  },
})

export default ({ mode }: ConfigEnv) => {
  const env = loadEnv(mode, process.cwd(), '')
  const hosts = allowedHosts(env.VITE_ALLOWED_HOSTS || 'talent_dev')

  return defineConfig({
    plugins: [
      tanstackRouter({
        target: 'react',
        autoCodeSplitting: true,
      }),
      canonicalUrlBanner(hosts[0]),
    ],
    server: {
      port: PORT,
      host: '0.0.0.0',
      allowedHosts: hosts,
      proxy: {
        // The app is origin-relative (VITE_BACKEND_API_URL is empty in every
        // mode), so the API is reached through this proxy in dev and through
        // nginx in the containers — one origin either way, never CORS.
        "/api": {
          target: env.VITE_PROXY_TARGET || 'http://127.0.0.1:8004',
          changeOrigin: true,
          secure: false,
          // FastAPI's trailing-slash redirect builds an ABSOLUTE Location from
          // the Host it was given — which changeOrigin rewrites to the proxy
          // target. Without this a phone would be redirected to 127.0.0.1:8004,
          // i.e. to itself. Rewrites Location back to the requested host.
          autoRewrite: true,
        }
      }
    },
  })
}
