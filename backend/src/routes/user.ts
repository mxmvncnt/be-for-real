import { Hono } from 'hono'
import { eq, or, ilike } from 'drizzle-orm'
import { usersTable } from '../db/schema.js'
import { db } from '../db/client.js'
import { getUserIdFromRequest } from '../utils/auth.js'

const user = new Hono()

user.get('/me', async (c) => {
	const currentUserId = await getUserIdFromRequest(c)
	if (!currentUserId) {
		return c.json({ error: 'Invalid or expired token' }, 401)
	}

	const rows = await db
		.select({
			id: usersTable.id,
			username: usersTable.username,
			email: usersTable.email,
			description: usersTable.description,
			profilePicUrl: usersTable.profilePicUrl,
		})
		.from(usersTable)
		.where(eq(usersTable.id, currentUserId))
		.limit(1)

	if (!rows || rows.length === 0) {
		return c.json({ error: 'User not found' }, 404)
	}

	return c.json(rows[0], 200)
})

user.patch('/description', async (c) => {
	const currentUserId = await getUserIdFromRequest(c)
	if (!currentUserId) {
		return c.json({ error: 'Invalid or expired token' }, 401)
	}

	const { description } = await c.req.json<{ description?: string }>()
	if (typeof description !== 'string') {
		return c.json({ error: 'Missing description' }, 400)
	}

	const trimmed = description.trim()

	const [updated] = await db
		.update(usersTable)
		.set({ description: trimmed })
		.where(eq(usersTable.id, currentUserId))
		.returning({
			id: usersTable.id,
			description: usersTable.description,
		})

	if (!updated) {
		return c.json({ error: 'User not found' }, 404)
	}

	return c.json(updated, 200)
})

user.get('/search', async (c) => {
	const currentUserId = await getUserIdFromRequest(c)
	if (!currentUserId) {
		return c.json({ error: 'Invalid or expired token' }, 401)
	}

	const query = c.req.query('q')?.trim()
	if (!query) {
		return c.json([], 200)
	}

	const matches = await db
		.select({
			id: usersTable.id,
			username: usersTable.username,
			email: usersTable.email,
			profilePicUrl: usersTable.profilePicUrl,
		})
		.from(usersTable)
		.where(or(ilike(usersTable.username, `%${query}%`), ilike(usersTable.email, `%${query}%`)))
		.limit(10)

	return c.json(
		matches.filter((match) => String(match.id) !== currentUserId),
		200,
	)
})

export default user
