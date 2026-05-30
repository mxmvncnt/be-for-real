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
    "/user/{friendId}/add": {
      post: {
        summary: "Add a friend for the authenticated user",
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
    "/user/friends": {
      get: {
        summary: "Get friends of the authenticated user",
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

// Use the middleware to serve Swagger UI at the root of this router (mounted at /swagger)
app.get("/", swaggerUI({ url: "/swagger/doc" }));

app.get("/health", (c) => c.text("OK"));

export default app;
