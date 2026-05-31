import { db } from '../db/client.js'
import { friendsTable } from '../db/schema.js'
import { and, eq, or } from 'drizzle-orm'

export default async function areUsersFriends(userId1: string, userId2: string): Promise<boolean> {
	const friendRows = await db
		.select()
		.from(friendsTable)
		.where(
			and(
				eq(friendsTable.confirmed, 1),
				or(
					and(eq(friendsTable.userId1, userId1), eq(friendsTable.userId2, userId2)),
					and(eq(friendsTable.userId1, userId2), eq(friendsTable.userId2, userId1)),
				),
			),
		)
	return friendRows.length == 1
}
