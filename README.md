# be-for-real

Base monorepo for a React PWA frontend and Hono API backend.

## Apps

- `frontend`: React + Vite + TypeScript + PWA shell
- `backend`: Hono + TypeScript API

## Getting started

```bash
npm install
npm run dev
```

Frontend runs on `http://localhost:5173`.
Backend runs on `http://localhost:3000`.

## Environment

Copy `frontend/.env.example` and `backend/.env.example` to local `.env` files before adding real integrations.

## Notes

The current backend source is set up around Hono and still references MongoDB tooling. If you want a real Postgres stack next, we can swap that over cleanly before adding product features.
