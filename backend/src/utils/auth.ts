import { eq } from 'drizzle-orm'
import { db } from '../db/client.js'
import { sessionsTable } from '../db/schema.js'

export async function getUserIdFromToken(token: string | undefined) {
  if (!token) return null;

  const [session] = await db
    .select()
    .from(sessionsTable)
    .where(eq(sessionsTable.token, token))
    .limit(1);

  if (!session) return null;

  return String(session.userId);
}

export async function getUserIdFromRequest(c: {
	req: { header: (name: string) => string | undefined }
}) {
	return getUserIdFromToken(c.req.header('authorization'))
}
