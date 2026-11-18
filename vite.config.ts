import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

function blockSensitivePathsPlugin(): Plugin {
  return {
    name: 'block-sensitive-paths',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = req.url?.split('?')[0] || ''
        if (url.startsWith('/data/') || url.startsWith('/server/')) {
          res.statusCode = 403
          res.end('Forbidden')
          return
        }
        next()
      })
    },
  }
}

export default defineConfig({
  plugins: [react(), tailwindcss(), blockSensitivePathsPlugin()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-three': ['three'],
          'vendor-icons': ['lucide-react'],
        },
      },
    },
  },
})
