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
  tags: [
    { name: "Auth", description: "Authentication" },
    { name: "Users", description: "User profile and friends" },
    { name: "Videos", description: "Video upload and feeds" },
  ],
  components: {
    securitySchemes: {
      TokenAuth: {
        type: "apiKey",
        in: "header",
        name: "authorization",
        description:
          "Raw token in the `authorization` header (no Bearer prefix)",
      },
    },
  },
  paths: {
    "/auth/register": {
      post: {
        summary: "Register a new user",
        tags: ["Auth"],
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
        tags: ["Auth"],
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
    "/auth/logout": {
      post: {
        summary: "Logout a user",
        tags: ["Auth"],
        security: [{ TokenAuth: [] }],
        responses: {
          "200": { description: "Session removed" },
          "401": { description: "Missing or invalid token" },
        },
      },
    },
    "/user/{friendId}/add": {
      post: {
        summary: "Add a friend for the authenticated user",
        tags: ["Users"],
        security: [{ TokenAuth: [] }],
        parameters: [
          {
            name: "friendId",
            in: "path",
            required: true,
            schema: { type: "string", format: "uuid" },
            description: "UUID of the user to add as friend",
          },
        ],
        responses: {
          "201": { description: "Friend added" },
          "200": { description: "Already friends" },
          "400": { description: "Cannot add yourself" },
          "401": { description: "Missing or invalid token" },
          "404": { description: "Friend not found" },
          "500": { description: "Database error" },
        },
      },
    },
    "/user/{friendId}/remove": {
      post: {
        summary: "Remove a friend for the authenticated user",
        tags: ["Users"],
        security: [{ TokenAuth: [] }],
        parameters: [
          {
            name: "friendId",
            in: "path",
            required: true,
            schema: { type: "string", format: "uuid" },
            description: "UUID of the user to remove from friends",
          },
        ],
        responses: {
          "200": { description: "Friend removed" },
          "400": { description: "Cannot remove yourself" },
          "401": { description: "Missing or invalid token" },
          "404": { description: "Friend relation not found" },
          "500": { description: "Database error" },
        },
      },
    },
    "/user/friends": {
      get: {
        summary: "Get friends of the authenticated user",
        tags: ["Users"],
        security: [{ TokenAuth: [] }],
        responses: {
          "200": {
            description: "List of friends",
            content: {
              "application/json": {
                schema: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      id: { type: "string", format: "uuid" },
                      username: { type: "string" },
                      email: { type: "string", format: "email" },
                      profilePicUrl: { type: "string" },
                    },
                  },
                },
              },
            },
          },
          "401": { description: "Missing or invalid token" },
        },
      },
    },
    "/videos/clips": {
      get: {
        summary: "Get all clips from friends",
        tags: ["Videos"],
        security: [{ TokenAuth: [] }],
        responses: {
          "200": { description: "List of clips" },
          "401": { description: "Missing or invalid token" },
        },
      },
    },
    "/videos/clips/{id}": {
      get: {
        summary: "Get all clips from a specific user",
        tags: ["Videos"],
        security: [{ TokenAuth: [] }],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string", format: "uuid" },
          },
        ],
        responses: {
          "200": { description: "List of clips" },
          "401": { description: "Missing or invalid token" },
        },
      },
    },
    "/videos/mashups": {
      get: {
        summary: "Get all mashups from friends",
        tags: ["Videos"],
        security: [{ TokenAuth: [] }],
        responses: {
          "200": { description: "List of mashups" },
          "401": { description: "Missing or invalid token" },
        },
      },
    },
    "/videos/mashups/{id}": {
      get: {
        summary: "Get all mashups from a specific user",
        tags: ["Videos"],
        security: [{ TokenAuth: [] }],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string", format: "uuid" },
          },
        ],
        responses: {
          "200": { description: "List of mashups" },
          "401": { description: "Missing or invalid token" },
        },
      },
    },
    "/videos/upload": {
      post: {
        summary: "Upload a 5s clip (stored on server)",
        tags: ["Videos"],
        security: [{ TokenAuth: [] }],
        parameters: [
          {
            name: "x-filename",
            in: "header",
            required: false,
            schema: { type: "string" },
            description: "Optional filename for the uploaded video",
          },
        ],
        requestBody: {
          required: true,
          content: {
            "video/webm": {
              schema: { type: "string", format: "binary" },
            },
            "video/mp4": {
              schema: { type: "string", format: "binary" },
            },
            "application/octet-stream": {
              schema: { type: "string", format: "binary" },
            },
          },
        },
        responses: {
          "201": { description: "Uploaded (returns id and createdAt)" },
          "400": { description: "Empty upload" },
          "401": { description: "Missing or invalid token" },
        },
      },
    },
  },
};

const app = new Hono();

// Serve the OpenAPI document
app.get("/doc", (c) => c.json(openApiDoc));

// Use the middleware to serve Swagger UI at the root of this router (mounted at /swagger)
app.get("/", swaggerUI({ url: "/swagger/doc" }));

app.get("/health", (c) => c.text("OK"));

export default app;
