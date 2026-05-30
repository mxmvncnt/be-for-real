import {integer, pgTable, uuid, varchar} from "drizzle-orm/pg-core";

export const usersTable = pgTable("users", {
    id: uuid().primaryKey().defaultRandom(),
    username: varchar({ length: 255 }).notNull().unique(),
    email: varchar({ length: 254 }).notNull().unique(),
    password: varchar({ length: 1024 }).notNull(),
    description: varchar({ length: 1024 }),
    profilePicUrl: varchar({ length: 1024 }),
});

