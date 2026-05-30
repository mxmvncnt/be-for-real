import { Hono } from 'hono'
import argon2 from 'argon2'
import {randomUUID} from "node:crypto";
import {eq, sql} from "drizzle-orm";
import {usersTable} from "../db/schema.js";
import {db} from "../db/client.js";

const auth = new Hono()

auth.post('/register', async (c) => {
    const { username, email, password } = await c.req.json<{
        username: string
        email: string
        password: string
    }>()

    const passwordHash = await argon2.hash(password, { type: argon2.argon2id })

    const [user] = await db
        .insert(usersTable)
        .values({
            id: randomUUID(),
            username,
            email,
            password: passwordHash,
        })
        .returning({ id: usersTable.id, username: usersTable.username, email: usersTable.email })

    return c.json(user, 201)
})

auth.post('/login', async (c) => {
    const { email, password } = await c.req.json<{
        email: string
        password: string
    }>()

    const [user] = await db
        .select()
        .from(usersTable)
        .where(eq(usersTable.email, email))
        .limit(1);

    if (!user) {
        return c.json({ error: 'Invalid credentials' }, 401)
    }

    let isPasswordValid = false

    try {
        isPasswordValid = await argon2.verify(user.password, password)
    } catch (error) {
        console.error('Password verification failed for user', email, error)
        return c.json({ error: 'Invalid credentials' }, 401)
    }

    if (!isPasswordValid) {
        return c.json({ error: 'Invalid credentials' }, 401)
    }

    return c.json(String('token'), 200)
})

export default auth;
