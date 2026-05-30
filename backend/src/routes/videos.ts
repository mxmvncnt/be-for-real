import { Hono } from "hono";
import { serveStatic } from "@hono/node-server/serve-static";
import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { and, eq, inArray, or } from "drizzle-orm";
import { db } from "../db/client.js";
import { friendsTable, sessionsTable, videosTable } from "../db/schema.js";

const videos = new Hono();

const UPLOADS_DIR = path.resolve("uploads");

function getFileExtension(contentType: string) {
  if (contentType.includes("video/webm")) return ".webm";
  if (contentType.includes("video/mp4")) return ".mp4";
  if (contentType.includes("video/quicktime")) return ".mov";
  return ".webm";
}

videos.get("/uploads/*", serveStatic({ root: UPLOADS_DIR }));

async function getUserIdFromToken(token: string | undefined) {
  if (!token) return null;

  const sessionRows = await db
    .select()
    .from(sessionsTable)
    .where(eq(sessionsTable.token, token))
    .limit(1);

  if (!sessionRows || sessionRows.length === 0) return null;

  return String(sessionRows[0].userId);
}

videos.post("/upload", async (c) => {
  const userId = await getUserIdFromToken(c.req.header("authorization"));
  if (!userId) {
    return c.json({ error: "Invalid or expired token" }, 401);
  }
  const contentType =
    c.req.header("content-type") ?? "application/octet-stream";
  const extension = getFileExtension(contentType);

  const requestedName = c.req.header("x-filename");
  let filename = requestedName
    ? path.basename(requestedName)
    : `${randomUUID()}${extension}`;
  if (requestedName && !path.extname(filename)) {
    filename = `${filename}${extension}`;
  }

  await fs.promises.mkdir(UPLOADS_DIR, { recursive: true });

  const buffer = Buffer.from(await c.req.arrayBuffer());
  if (!buffer.length) {
    return c.json({ error: "Empty upload" }, 400);
  }

  const filePath = path.join(UPLOADS_DIR, filename);
  await fs.promises.writeFile(filePath, buffer);

  const type = "clip";
  const baseUrl = new URL(c.req.url).origin;
  const videoUrl = `${baseUrl}/videos/uploads/${encodeURIComponent(filename)}`;
  const id = randomUUID();
  const createdAt = new Date();

  await db.insert(videosTable).values({
    id,
    userId,
    createdAt,
    videoUrl,
    filename,
    type,
  });

  return c.json({ id, videoUrl, filename, type, createdAt }, 201);
});

videos.get("/clips", async (c) => {
  const userId = await getUserIdFromToken(c.req.header("authorization"));
  if (!userId) {
    return c.json({ error: "Invalid or expired token" }, 401);
  }

  const friendRows = await db
    .select()
    .from(friendsTable)
    .where(
      or(eq(friendsTable.userId1, userId), eq(friendsTable.userId2, userId)),
    );

  const friendIds = friendRows
    .map((row) =>
      String(row.userId1) === userId
        ? String(row.userId2)
        : String(row.userId1),
    )
    .filter((id) => id !== userId);

  if (friendIds.length === 0) {
    return c.json([], 200);
  }

  const clips = await db
    .select()
    .from(videosTable)
    .where(
      and(eq(videosTable.type, "clip"), inArray(videosTable.userId, friendIds)),
    );

  return c.json(clips, 200);
});

videos.get("/clips/:id", async (c) => {
  const userId = await getUserIdFromToken(c.req.header("authorization"));
  if (!userId) {
    return c.json({ error: "Invalid or expired token" }, 401);
  }

  const targetUserId = String(c.req.param("id"));
  const clips = await db
    .select()
    .from(videosTable)
    .where(
      and(eq(videosTable.type, "clip"), eq(videosTable.userId, targetUserId)),
    );

  return c.json(clips, 200);
});

videos.get("/mashups", async (c) => {
  const userId = await getUserIdFromToken(c.req.header("authorization"));
  if (!userId) {
    return c.json({ error: "Invalid or expired token" }, 401);
  }

  const friendRows = await db
    .select()
    .from(friendsTable)
    .where(
      or(eq(friendsTable.userId1, userId), eq(friendsTable.userId2, userId)),
    );

  const friendIds = friendRows
    .map((row) =>
      String(row.userId1) === userId
        ? String(row.userId2)
        : String(row.userId1),
    )
    .filter((id) => id !== userId);

  if (friendIds.length === 0) {
    return c.json([], 200);
  }

  const mashups = await db
    .select()
    .from(videosTable)
    .where(
      and(
        eq(videosTable.type, "mashup"),
        inArray(videosTable.userId, friendIds),
      ),
    );

  return c.json(mashups, 200);
});

videos.get("/mashups/:id", async (c) => {
  const userId = await getUserIdFromToken(c.req.header("authorization"));
  if (!userId) {
    return c.json({ error: "Invalid or expired token" }, 401);
  }

  const targetUserId = String(c.req.param("id"));
  const mashups = await db
    .select()
    .from(videosTable)
    .where(
      and(eq(videosTable.type, "mashup"), eq(videosTable.userId, targetUserId)),
    );

  return c.json(mashups, 200);
});

export default videos;
