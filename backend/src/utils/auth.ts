import { eq } from 'drizzle-orm'
import { db } from '../db/client.js'
import { sessionsTable } from '../db/schema.js'

export async function getUserIdFromToken(token: string | undefined) {
	if (!token) return null

	const sessionRows = await db
		.select()
		.from(sessionsTable)
		.where(eq(sessionsTable.token, token))
		.limit(1)

	if (!sessionRows || sessionRows.length === 0) return null

	return String(sessionRows[0].userId)
}

export async function getUserIdFromRequest(c: {
	req: { header: (name: string) => string | undefined }
}) {
	return getUserIdFromToken(c.req.header('authorization'))
}
