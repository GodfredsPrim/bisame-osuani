# Fun2Learn Next Frontend

This is the Next.js frontend for Fun2Learn Online. It now hosts the migrated React application that powers study coaching, question generation, quizzes, resources, leaderboards, and admin tools.

## Development

Run the frontend:

```bash
npm run dev
```

Open `http://localhost:3000`.

By default, frontend API calls to `/api/*` are rewritten to the FastAPI backend at `http://127.0.0.1:8000/api/*`, matching the old Vite proxy behavior.

If you need a different backend URL, set:

```bash
NEXT_PUBLIC_API_URL=http://your-backend-host/api
```

## Production

Create a production build with:

```bash
npm run build
npm run start
```

The current migration keeps the original SPA behavior inside Next.js so we can modernize routing and server features incrementally without breaking the product.
