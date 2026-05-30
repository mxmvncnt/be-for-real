import {integer, pgTable, primaryKey, uuid, varchar} from "drizzle-orm/pg-core";

export const usersTable = pgTable("users", {
    id: uuid().primaryKey().defaultRandom(),
    username: varchar({ length: 255 }).notNull().unique(),
    email: varchar({ length: 254 }).notNull().unique(),
    password: varchar({ length: 1024 }).notNull(),
    description: varchar({ length: 1024 }),
    profilePicUrl: varchar({ length: 1024 }),
});

export const friendsTable = pgTable("friends", {
    userId1: uuid().notNull().references(() => usersTable.id, { onDelete: "cascade" }),
    userId2: uuid().notNull().references(() => usersTable.id, { onDelete: "cascade" }),
}, (table) => [
    primaryKey({ columns: [table.userId1, table.userId2] }),
]);