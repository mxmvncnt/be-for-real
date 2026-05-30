import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { drizzle } from 'drizzle-orm/node-postgres';
import argon2 from 'argon2'
import {randomUUID} from "node:crypto";
import {usersTable} from "./db/schema.js";
import {Pool} from "pg";
import {eq, sql} from "drizzle-orm";
import auth from "./routes/auth.js";
import user from "./routes/user.js";

const app = new Hono()

app.get('/', (c) => {
  return c.text('Hello Hono!')
})

app.route('/auth', auth)
app.route('/user', user)

serve({
  fetch: app.fetch,
  port: Number(process.env.SERVER_PORT)
}, (info) => {
  console.log(`Server is running on http://localhost:${info.port}`)
})
