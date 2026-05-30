import { Hono } from "hono";

const videos = new Hono();

videos.post("/clips/:date", async (c) => {
  return c.json({ message: "Clips functionality not implemented yet" }, 501);
});

videos.post("/mashup/:date", async (c) => {
  return c.json({ message: "Mashup functionality not implemented yet" }, 501);
});

export default videos;
