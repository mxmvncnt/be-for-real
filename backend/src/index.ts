import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { readFile } from "node:fs/promises";
import path from "node:path";
import auth from "./routes/auth.js";
import friend from "./routes/friend.js";
import user from "./routes/user.js";
import videos from "./routes/videos.js";
import swagger from "./swagger.js";
import { logger } from "hono/logger";

const app = new Hono();

app.use(logger());

app.get("/", (c) => {
  return c.text("Hello Hono!");
});

app.get("/uploads/:filename", async (c) => {
  const filename = c.req.param("filename");
  const absolutePath = path.resolve(process.cwd(), "uploads", filename);

  try {
    const fileBuffer = await readFile(absolutePath);
    return c.body(fileBuffer, 200, {
      "Cache-Control": "no-store",
    });
  } catch {
    return c.json({ error: "File not found" }, 404);
  }
});

app.route("/auth", auth);
app.route("/", friend);
app.route("/user", user);
app.route("/videos", videos);
app.route("/swagger", swagger);

const serverPort = parseInt(
  process.env.SERVER_PORT ?? process.env.PORT ?? "3000",
  10,
);

serve(
  {
    fetch: app.fetch,
    port: serverPort,
  },
  (info) => {
    console.log(
      `Server is running on http://localhost:${info.port} - Swagger: http://localhost:${info.port}/swagger`,
    );
  },
);
