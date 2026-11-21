import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import { theme } from './src/theme/colors'
import { manifestJson, iconSvg } from './src/theme/static'
function themeStatic(): Plugin {
  const files: Record<string, { type: string; body: string }> = {
    '/manifest.webmanifest': { type: 'application/manifest+json', body: manifestJson(theme) },
    '/icon.svg': { type: 'image/svg+xml', body: iconSvg(theme) },
  }
  return {
    name: 'theme-static',
    transformIndexHtml: (html) => html.replace(/__THEME_BG__/g, theme.dark.bg),
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const f = files[(req.url ?? '').split('?')[0]]
        if (!f) return next()
        res.setHeader('Content-Type', f.type)
        res.end(f.body)
      })
    },
    generateBundle() {
      for (const [url, f] of Object.entries(files)) this.emitFile({ type: 'asset', fileName: url.slice(1), source: f.body })
    },
  }
}

export default defineConfig({
  plugins: [react(), themeStatic()],
  build: { target: 'es2020', cssCodeSplit: true, chunkSizeWarningLimit: 1200 },
  esbuild: { drop: ['console', 'debugger'] },
  test: { environment: 'node', include: ['tests/**/*.test.ts'] }
})
