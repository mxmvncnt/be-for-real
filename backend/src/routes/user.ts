import { Hono } from "hono";
import { eq, and } from "drizzle-orm";
import { usersTable, sessionsTable, friendsTable } from "../db/schema.js";
import { db } from "../db/client.js";

const user = new Hono();

user.post("/:friendId/add", async (c) => {
  const token = c.req.header("authorization");
  if (!token) return c.json({ error: "Missing authorization token" }, 401);

  // Find session
  const sessionRows = await db
    .select()
    .from(sessionsTable)
    .where(eq(sessionsTable.token, token))
    .limit(1);

  if (!sessionRows || sessionRows.length === 0) {
    return c.json({ error: "Invalid or expired token" }, 401);
  }

  const currentUserId = String(sessionRows[0].userId);
  const friendId = String(c.req.param("friendId"));

  // Verify friend exists
  const friendRows = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, friendId))
    .limit(1);

  if (!friendRows || friendRows.length === 0) {
    return c.json({ error: "Friend not found" }, 404);
  }

  if (currentUserId === friendId) {
    return c.json({ error: "Cannot add yourself as a friend" }, 400);
  }

  // Canonicalize order to avoid duplicates (userId1 < userId2)
  const [userId1, userId2] = [currentUserId, friendId].sort();

  // Check existing relation
  const existing = await db
    .select()
    .from(friendsTable)
    .where(
      and(eq(friendsTable.userId1, userId1), eq(friendsTable.userId2, userId2)),
    )
    .limit(1);

  if (existing && existing.length > 0) {
    return c.json({ message: "Already friends" }, 200);
  }

  // Insert new friendship (handle race/unique violation)
  try {
    await db.insert(friendsTable).values({ userId1, userId2 });
    return c.json({ message: "Friend added" }, 201);
  } catch (err) {
    // Postgres unique violation code is 23505 — treat as already exists
    if (
      err &&
      typeof err === "object" &&
      "code" in err &&
      err.code === "23505"
    ) {
      return c.json({ message: "Already friends" }, 200);
    }
    return c.json({ error: "Database error" }, 500);
  }
});

export default user;
