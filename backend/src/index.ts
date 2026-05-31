import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import auth from './routes/auth.js'
import user from './routes/user.js'
import videos from './routes/videos.js'
import swagger from './swagger.js'

const app = new Hono()

app.get('/', (c) => {
  return c.text('Hello Hono!')
})

app.get('/uploads/*', async (c) => {
  const relativePath = c.req.path.replace(/^\/uploads\//, '')
  const uploadsRoot = path.resolve(process.cwd(), 'uploads')
  const absolutePath = path.resolve(uploadsRoot, relativePath)

  if (!absolutePath.startsWith(uploadsRoot)) {
    return c.json({ error: 'File not found' }, 404)
  }

  try {
    const fileBuffer = await readFile(absolutePath)
    const extension = path.extname(relativePath).toLowerCase()
    const contentType =
      extension === '.mp4'
        ? 'video/mp4'
        : extension === '.mov'
          ? 'video/quicktime'
          : 'video/webm'

    return c.body(fileBuffer, 200, {
      'Content-Type': contentType,
      'Cache-Control': 'no-store',
    })
  } catch {
    return c.json({ error: 'File not found' }, 404)
  }
})

app.route('/auth', auth)
app.route('/user', user)
app.route('/videos', videos)
app.route('/swagger', swagger)

const serverPort = parseInt(process.env.SERVER_PORT ?? process.env.PORT ?? '3000', 10)

serve(
  {
    fetch: app.fetch,
    port: serverPort,
  },
  (info) => {
    console.log(
      `Server is running on http://localhost:${info.port} - Swagger: http://localhost:${info.port}/swagger`,
    )
  },
)
