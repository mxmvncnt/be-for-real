import { drizzle } from 'drizzle-orm/node-postgres'

export const db = drizzle(
  `postgres://${process.env.DATABASE_USER}:${process.env.DATABASE_PASS}@${process.env.DATABASE_HOST}:${process.env.DATABASE_PORT}/${process.env.DATABASE_NAME}`,
);
