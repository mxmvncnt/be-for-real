import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { drizzle } from 'drizzle-orm/node-postgres';
import argon2 from 'argon2'
import {randomUUID} from "node:crypto";
import {users} from "./db/schema.js";
import {Pool} from "pg";
import {sql} from "drizzle-orm";

const app = new Hono()
const db = drizzle(`postgres://${process.env.DATABASE_USER}:${process.env.DATABASE_PASS}@${process.env.DATABASE_HOST}:${process.env.DATABASE_PORT}/${process.env.DATABASE_NAME}`)

app.get('/', (c) => {
  return c.text('Hello Hono!')
})

app.post('/auth/register', async (c) => {
  const { username, email, password } = await c.req.json<{
    username: string
    email: string
    password: string
  }>()

  const passwordHash = await argon2.hash(password, { type: argon2.argon2id })

  const [user] = await db
      .insert(users)
      .values({
        id: randomUUID(),
        username,
        email,
        password: passwordHash,
      })
      .returning({ id: users.id, username: users.username, email: users.email })

  return c.json(user, 201)
})


serve({
  fetch: app.fetch,
  port: 3000
}, (info) => {
  console.log(`Server is running on http://localhost:${info.port}`)
})
