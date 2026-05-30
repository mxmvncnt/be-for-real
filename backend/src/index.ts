import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'

const app = new Hono()

app.get('/', (c) => {
  return c.text('Hello Hono!')
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
  port: 3000
}, (info) => {
  console.log(`Server is running on http://localhost:${info.port}`)
})
