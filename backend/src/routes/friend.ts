import { Hono } from "hono";
import { and, eq, or } from "drizzle-orm";
import { db } from "../db/client.js";
import { friendsTable, usersTable } from "../db/schema.js";
import { getUserIdFromRequest } from "../utils/auth.js";

const friend = new Hono();

async function getFriendRelation(userId1: string, userId2: string) {
  return db
    .select()
    .from(friendsTable)
    .where(
      or(
        and(
          eq(friendsTable.userId1, userId1),
          eq(friendsTable.userId2, userId2),
        ),
        and(
          eq(friendsTable.userId1, userId2),
          eq(friendsTable.userId2, userId1),
        ),
      ),
    )
    .limit(1);
}

friend.post("/friend/:friendId/add", async (c) => {
  const currentUserId = await getUserIdFromRequest(c);
  if (!currentUserId) {
    return c.json({ error: "Invalid or expired token" }, 401);
  }

  const friendId = String(c.req.param("friendId"));
  if (currentUserId === friendId) {
    return c.json({ error: "Cannot add yourself as a friend" }, 400);
  }

  const friendRows = await db
    .select({ id: usersTable.id })
    .from(usersTable)
    .where(eq(usersTable.id, friendId))
    .limit(1);

  if (!friendRows || friendRows.length === 0) {
    return c.json({ error: "Friend not found" }, 404);
  }

  const [existing] = await getFriendRelation(currentUserId, friendId);
  if (existing) {
    return c.json({ message: "Already friends" }, 200);
  }

  await db.insert(friendsTable).values({
    userId1: currentUserId,
    userId2: friendId,
    confirmed: 0,
  });

  return c.json({ message: "Friend request sent" }, 201);
});

friend.post("/friend/:friendId/accept", async (c) => {
  const currentUserId = await getUserIdFromRequest(c);
  if (!currentUserId) {
    return c.json({ error: "Invalid or expired token" }, 401);
  }

  const friendId = String(c.req.param("friendId"));

  const [pending] = await db
    .select()
    .from(friendsTable)
    .where(
      and(
        eq(friendsTable.userId1, friendId),
        eq(friendsTable.userId2, currentUserId),
        eq(friendsTable.confirmed, 0),
      ),
    )
    .limit(1);

  if (!pending) {
    return c.json({ error: "Friend request not found" }, 404);
  }

  await db
    .update(friendsTable)
    .set({ confirmed: 1 })
    .where(
      and(
        eq(friendsTable.userId1, friendId),
        eq(friendsTable.userId2, currentUserId),
      ),
    );

  return c.json({ message: "Friend request accepted" }, 200);
});

friend.post("/friend/:friendId/remove", async (c) => {
  const currentUserId = await getUserIdFromRequest(c);
  if (!currentUserId) {
    return c.json({ error: "Invalid or expired token" }, 401);
  }

  const friendId = String(c.req.param("friendId"));
  if (currentUserId === friendId) {
    return c.json({ error: "Cannot remove yourself" }, 400);
  }

  const [existing] = await getFriendRelation(currentUserId, friendId);
  if (!existing) {
    return c.json({ error: "Friend relation not found" }, 404);
  }

  await db
    .delete(friendsTable)
    .where(
      and(
        eq(friendsTable.userId1, existing.userId1),
        eq(friendsTable.userId2, existing.userId2),
      ),
    );

  if (existing.confirmed === 1) {
    return c.json({ message: "Friend removed" }, 200);
  }

  if (String(existing.userId1) === currentUserId) {
    return c.json({ message: "Friend request canceled" }, 200);
  }

  return c.json({ message: "Friend request refused" }, 200);
});

friend.get("/friends", async (c) => {
  const currentUserId = await getUserIdFromRequest(c);
  if (!currentUserId) {
    return c.json({ error: "Invalid or expired token" }, 401);
  }

  const friendRows = await db
    .select()
    .from(friendsTable)
    .where(
      and(
        eq(friendsTable.confirmed, 1),
        or(
          eq(friendsTable.userId1, currentUserId),
          eq(friendsTable.userId2, currentUserId),
        ),
      ),
    );

  if (!friendRows || friendRows.length === 0) {
    return c.json([], 200);
  }

  const friendIds = friendRows.map((row) =>
    String(row.userId1) === currentUserId
      ? String(row.userId2)
      : String(row.userId1),
  );

  const friends = await Promise.all(
    friendIds.map(async (id) => {
      const rows = await db
        .select()
        .from(usersTable)
        .where(eq(usersTable.id, id))
        .limit(1);
      if (!rows || rows.length === 0) return null;
      const user = rows[0];
      return {
        id: String(user.id),
        username: user.username,
        email: user.email,
        profilePicUrl: user.profilePicUrl,
      };
    }),
  );

  return c.json(friends.filter(Boolean), 200);
});

friend.get("/friendrequests/received", async (c) => {
  const currentUserId = await getUserIdFromRequest(c);
  if (!currentUserId) {
    return c.json({ error: "Invalid or expired token" }, 401);
  }

  const requestRows = await db
    .select()
    .from(friendsTable)
    .where(
      and(
        eq(friendsTable.userId2, currentUserId),
        eq(friendsTable.confirmed, 0),
      ),
    );

  if (!requestRows || requestRows.length === 0) {
    return c.json([], 200);
  }

  const requesterIds = requestRows.map((row) => String(row.userId1));

  const requesters = await Promise.all(
    requesterIds.map(async (id) => {
      const rows = await db
        .select()
        .from(usersTable)
        .where(eq(usersTable.id, id))
        .limit(1);
      if (!rows || rows.length === 0) return null;
      const user = rows[0];
      return {
        id: String(user.id),
        username: user.username,
        email: user.email,
        profilePicUrl: user.profilePicUrl,
      };
    }),
  );

  return c.json(requesters.filter(Boolean), 200);
});

friend.get("/friendrequests/sent", async (c) => {
  const currentUserId = await getUserIdFromRequest(c);
  if (!currentUserId) {
    return c.json({ error: "Invalid or expired token" }, 401);
  }

  const requestRows = await db
    .select()
    .from(friendsTable)
    .where(
      and(
        eq(friendsTable.userId1, currentUserId),
        eq(friendsTable.confirmed, 0),
      ),
    );

  if (!requestRows || requestRows.length === 0) {
    return c.json([], 200);
  }

  const recipientIds = requestRows.map((row) => String(row.userId2));

  const recipients = await Promise.all(
    recipientIds.map(async (id) => {
      const rows = await db
        .select()
        .from(usersTable)
        .where(eq(usersTable.id, id))
        .limit(1);
      if (!rows || rows.length === 0) return null;
      const user = rows[0];
      return {
        id: String(user.id),
        username: user.username,
        email: user.email,
        profilePicUrl: user.profilePicUrl,
      };
    }),
  );

  return c.json(recipients.filter(Boolean), 200);
});

export default friend;
