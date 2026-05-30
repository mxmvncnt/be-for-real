import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'

const app = new Hono()
const port = Number(process.env.PORT ?? 3000)
const frontendOrigin = process.env.FRONTEND_ORIGIN ?? 'http://localhost:5173'

app.use(
  '/api/*',
  cors({
    origin: frontendOrigin,
  }),
)

app.get('/', (c) => {
  return c.json({
    name: 'be-for-real-api',
    status: 'ok',
  })
})

app.get('/api/health', (c) => {
  return c.json({
    ok: true,
    service: 'backend',
    timestamp: new Date().toISOString(),
  })
})

type LoginResponse =
    | { success: true; token: string }
    | { success: false; error: string }

const loginSchema = z.object({
  email: z.email(),
  password: z.string().min(8),
})

app.post('/api/register', zValidator('json', loginSchema), async (c) => {
  const { email, password } = c.req.valid('json')

  if (password !== 'correct-horse-battery-staple') {
    return c.json<LoginResponse>({ success: false, error: 'Invalid credentials' }, 401)
  }

  return c.json<LoginResponse>({ success: true, token: 'jwt-goes-here' })
})

serve({
  fetch: app.fetch,
  port
}, (info) => {
  console.log(`Server is running on http://localhost:${info.port}`)
})
