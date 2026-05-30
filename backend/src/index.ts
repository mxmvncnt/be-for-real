import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { drizzle } from 'drizzle-orm/node-postgres';
import argon2 from 'argon2'

const app = new Hono()
const db = drizzle(`postgres://${process.env.DATABASE_USER}:%{DATABASE_PASS}@${process.env.DATABASE_HOST}:$process.env.{DATABASE_PORT}/${process.env.DATABASE_NAME}`);
app.get('/', (c) => {
  return c.text('Hello Hono!')
})

app.post('/auth/register', async (c) => {
  const { email, username, password } = await c.req.json<{
    email: string
    username: string
    password: string
  }>()

  const passwordHash = await argon2.hash(password, { type: argon2.argon2id })

  const result = await users.insertOne({ email, username, password: passwordHash })

  return c.json({ id: result.insertedId.toHexString() }, 201)
})


serve({
  fetch: app.fetch,
  port: 3000
}, (info) => {
  console.log(`Server is running on http://localhost:${info.port}`)
})
