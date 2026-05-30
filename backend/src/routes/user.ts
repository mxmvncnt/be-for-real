import { Hono } from 'hono'
import argon2 from 'argon2'
import {randomUUID} from "node:crypto";
import {usersTable} from "../db/schema.js";
import {db} from "../db/client.js";

const user = new Hono()

user.post('/:id/add', async (c) => {
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

export default user;