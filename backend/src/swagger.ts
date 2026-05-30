import { Hono } from "hono";
import { swaggerUI } from "@hono/swagger-ui";

// A basic OpenAPI document
const openApiDoc = {
  openapi: "3.0.0", // This is the required version field
  info: {
    title: "API Documentation",
    version: "1.0.0",
    description: "API documentation for your service",
  },
  paths: {
    "/auth/register": {
      post: {
        summary: "Register a new user",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  username: { type: "string" },
                  email: { type: "string", format: "email" },
                  password: { type: "string" },
                },
                required: ["username", "email", "password"],
              },
            },
          },
        },
        responses: {
          "201": { description: "Created" },
        },
      },
    },
    "/auth/login": {
      post: {
        summary: "Login a user",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  email: { type: "string", format: "email" },
                  password: { type: "string" },
                },
                required: ["email", "password"],
              },
            },
          },
        },
        responses: {
          "201": { description: "Token returned" },
          "401": { description: "Invalid credentials" },
        },
      },
    },
    "/user/{id}/add": {
      post: {
        summary: "Add a friend for a user",
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
        ],
        responses: {
          "501": { description: "Not implemented" },
        },
      },
    },
    "/videos/clips/{date}": {
      post: {
        summary: "Create clips for a date",
        parameters: [
          {
            name: "date",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
        ],
        responses: { "501": { description: "Not implemented" } },
      },
    },
    "/videos/mashup/{date}": {
      post: {
        summary: "Create mashup for a date",
        parameters: [
          {
            name: "date",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
        ],
        responses: { "501": { description: "Not implemented" } },
      },
    },
  },
};

const app = new Hono();

// Serve the OpenAPI document
app.get("/doc", (c) => c.json(openApiDoc));

// Use the middleware to serve Swagger UI at /ui
app.get("/ui", swaggerUI({ url: "/swagger/doc" }));

app.get("/health", (c) => c.text("OK"));

export default app;
