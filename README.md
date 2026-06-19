# CodeCraftHub

Simple learning-management demo app (frontend + small Express API) for managing courses.

## Features

- REST API for courses (`/api/courses`) with CRUD operations
- Small static frontend showing course list, add/edit/delete features
- Data persisted to `data/courses.json`

## Prerequisites

- Node.js 16+ (or compatible)
- npm (optional, used for installing dev tools)

## Setup & Run

1. Install dependencies (optional if you don't need extra packages):

```bash
npm install
```

2. Start the API server (runs on port 5001):

```bash
node app.js
```

3. Serve the frontend (recommended) so `fetch` works from `http://localhost`:

Option A — using a simple static server (recommended):

```bash
npx serve . -l 3000
# or
npx http-server -p 3000
```

Then open `http://localhost:3000/index.html` in your browser.

Option B — open file directly (may be blocked by browser CORS rules):

Open `index.html` in the browser, but if you see network or CORS errors, use Option A.

## API Endpoints

- `GET /api/courses` — returns `{ success: true, data: [...] }`
- `POST /api/courses` — create course
- `PUT /api/courses/:id` — update course
- `DELETE /api/courses/:id` — delete course

All data is stored in `data/courses.json`.

## Troubleshooting

- Error: `Failed to load courses. Please try again.` with `courses.map is not a function` — Cause: the frontend attempted to use `courses.map` on the raw API response object. Fix: the frontend now extracts `payload.data` from the API response so `courses` is an array. If you still see this:
  - Check the `/api/courses` response in DevTools → Network and confirm it returns JSON like `{ "success": true, "data": [ ... ] }`.
  - If the API responds with `{ "success": false, "error": "..." }`, the frontend will show the error message.

- If port 5001 is in use, change `PORT` in `app.js` or stop the other service.

## Development notes

- Data file path: `data/courses.json`
- Server entry: `app.js` (Express)
- Frontend: `index.html` (vanilla JS)

If you want, I can add npm scripts to start both server and frontend with one command.

---

Created/updated by assistant to include setup and troubleshooting steps.
