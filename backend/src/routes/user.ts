import { Hono } from "hono";
import { eq, and, or, ilike } from "drizzle-orm";
import { usersTable, friendsTable } from "../db/schema.js";
import { db } from "../db/client.js";
import { getUserIdFromRequest } from "../utils/auth.js";

const user = new Hono();

user.get("/me", async (c) => {
  const currentUserId = await getUserIdFromRequest(c);
  if (!currentUserId) {
    return c.json({ error: "Invalid or expired token" }, 401);
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
    .limit(1);

  if (!rows || rows.length === 0) {
    return c.json({ error: "User not found" }, 404);
  }

  return c.json(rows[0], 200);
});

user.patch("/description", async (c) => {
  const currentUserId = await getUserIdFromRequest(c);
  if (!currentUserId) {
    return c.json({ error: "Invalid or expired token" }, 401);
  }

  const { description } = await c.req.json<{ description?: string }>();
  if (typeof description !== "string") {
    return c.json({ error: "Missing description" }, 400);
  }

  const trimmed = description.trim();

  const [updated] = await db
    .update(usersTable)
    .set({ description: trimmed })
    .where(eq(usersTable.id, currentUserId))
    .returning({
      id: usersTable.id,
      description: usersTable.description,
    });

  if (!updated) {
    return c.json({ error: "User not found" }, 404);
  }

  return c.json(updated, 200);
});

user.post("/:friendId/add", async (c) => {
  const currentUserId = await getUserIdFromRequest(c);
  if (!currentUserId) {
    return c.json({ error: "Invalid or expired token" }, 401);
  }
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

user.get("/friends", async (c) => {
  const currentUserId = await getUserIdFromRequest(c);
  if (!currentUserId) {
    return c.json({ error: "Invalid or expired token" }, 401);
  }

  const friendRows = await db
    .select()
    .from(friendsTable)
    .where(
      or(
        eq(friendsTable.userId1, currentUserId),
        eq(friendsTable.userId2, currentUserId),
      ),
    );

  if (!friendRows || friendRows.length === 0) {
    return c.json([], 200);
  }

  const friendIds = friendRows.map((r) =>
    String(r.userId1) === currentUserId ? String(r.userId2) : String(r.userId1),
  );

  const friends = await Promise.all(
    friendIds.map(async (id) => {
      const rows = await db
        .select()
        .from(usersTable)
        .where(eq(usersTable.id, id))
        .limit(1);
      if (!rows || rows.length === 0) return null;
      const u = rows[0];
      return {
        id: String(u.id),
        username: u.username,
        email: u.email,
        profilePicUrl: u.profilePicUrl,
      };
    }),
  );

  return c.json(friends.filter(Boolean), 200);
});

user.get("/search", async (c) => {
  const currentUserId = await getUserIdFromRequest(c);
  if (!currentUserId) {
    return c.json({ error: "Invalid or expired token" }, 401);
  }

  const query = c.req.query("q")?.trim();
  if (!query) {
    return c.json([], 200);
  }

  const matches = await db
    .select({
      id: usersTable.id,
      username: usersTable.username,
      email: usersTable.email,
      profilePicUrl: usersTable.profilePicUrl,
    })
    .from(usersTable)
    .where(
      or(
        ilike(usersTable.username, `%${query}%`),
        ilike(usersTable.email, `%${query}%`),
      ),
    )
    .limit(10);

  return c.json(
    matches.filter((match) => String(match.id) !== currentUserId),
    200,
  );
});

user.post("/:friendId/remove", async (c) => {
  const currentUserId = await getUserIdFromRequest(c);
  if (!currentUserId) {
    return c.json({ error: "Invalid or expired token" }, 401);
  }
  const friendId = String(c.req.param("friendId"));

  if (currentUserId === friendId) {
    return c.json({ error: "Cannot remove yourself" }, 400);
  }

  // Canonicalize order
  const [userId1, userId2] = [currentUserId, friendId].sort();

  // Check existing relation
  const existing = await db
    .select()
    .from(friendsTable)
    .where(
      and(eq(friendsTable.userId1, userId1), eq(friendsTable.userId2, userId2)),
    )
    .limit(1);

  if (!existing || existing.length === 0) {
    return c.json({ error: "Friend relation not found" }, 404);
  }

  // Delete relation
  try {
    await db
      .delete(friendsTable)
      .where(
        and(
          eq(friendsTable.userId1, userId1),
          eq(friendsTable.userId2, userId2),
        ),
      );
    return c.json({ message: "Friend removed" }, 200);
  } catch (err) {
    return c.json({ error: "Database error" }, 500);
  }
});

export default user;
