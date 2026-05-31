import {
  integer,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

export const usersTable = pgTable("users", {
  id: uuid().primaryKey().defaultRandom(),
  username: varchar({ length: 255 }).notNull().unique(),
  email: varchar({ length: 254 }).notNull().unique(),
  password: varchar({ length: 1024 }).notNull(),
  description: varchar({ length: 1024 }),
  profilePicUrl: varchar({ length: 1024 }),
});

export const sessionsTable = pgTable("sessions", {
  token: varchar({ length: 128 }).primaryKey(),
  userId: uuid()
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  createdAt: timestamp().notNull(),
  expiresAt: timestamp().notNull(),
});

export const friendsTable = pgTable(
  "friends",
  {
    userId1: uuid()
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    userId2: uuid()
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    confirmed: integer().notNull().default(0),
  },
  (table) => [primaryKey({ columns: [table.userId1, table.userId2] })],
);

export const videosTable = pgTable("videos", {
  id: uuid().primaryKey().defaultRandom(),
  userId: uuid()
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  createdAt: timestamp().notNull(),
  videoUrl: varchar({ length: 1024 }).notNull().unique(),
  filename: varchar({ length: 1024 }).notNull().unique(),
  type: text({ enum: ["clip", "mashup"] }),
});

export const commentsTable = pgTable("comments", {
  id: uuid().primaryKey().defaultRandom(),
  userId: uuid()
    .notNull()
    .references(() => usersTable.id),
  videoId: uuid()
    .notNull()
    .references(() => videosTable.id),
  content: varchar({ length: 8096 }).notNull().unique(),
});
