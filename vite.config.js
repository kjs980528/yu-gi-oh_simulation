import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { readFile } from 'fs/promises'
import { join } from 'path'
import { fileURLToPath } from 'url'

const __dirname = fileURLToPath(new URL('.', import.meta.url))

export default defineConfig({
  base: '/yu-gi-oh_simulation/',
  server: {
    proxy: {
      '/api/ygopro': {
        target: 'https://db.ygoprodeck.com/api/v7',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/ygopro/, ''),
      },
    },
  },
  plugins: [
    react(),
    {
      name: 'local-card-data',
      configureServer(server) {
        server.middlewares.use('/api/local-card', async (req, res, next) => {
          try {
            const password = req.url?.slice(1)
            if (!password || !/^\d+$/.test(password)) return next()
            const padded = password.padStart(8, '0')
            const filePath = join(__dirname, '..', 'data', 'cards', `${padded}.json`)
            const data = await readFile(filePath, 'utf-8')
            res.setHeader('Content-Type', 'application/json')
            res.setHeader('Access-Control-Allow-Origin', '*')
            res.end(data)
          } catch {
            res.statusCode = 404
            res.end('Not found')
          }
        })
      },
    },
  ],
})
