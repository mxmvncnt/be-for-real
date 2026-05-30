import { Hono } from "hono";
import argon2 from "argon2";
import { randomUUID } from "node:crypto";
import { usersTable } from "../db/schema.js";
import { db } from "../db/client.js";

const user = new Hono();

user.post("/:id/add", async (c) => {
  return c.json(
    { message: "Add friend functionality not implemented yet" },
    501,
  );
});

export default user;
