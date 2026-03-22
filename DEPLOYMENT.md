# Deployment Guide

This guide covers production deployment for the full AI Assessment Creator stack.

## 1. Architecture

- Frontend: Next.js app in frontend
- Backend API + WebSocket: Express app in backend
- Data services: MongoDB + Redis
- AI service: Google Gemini API

## 2. Production Environment Variables

### Backend (backend/.env)

Required:

- PORT: API port (for example 5000)
- JWT_SECRET: strong random secret
- MONGODB_URI: MongoDB connection string
- GEMINI_API_KEY: Google Gemini API key
- FRONTEND_URL: deployed frontend URL for CORS (for example https://your-frontend.example.com)

Redis (choose one strategy):

- REDIS_URL (recommended for managed Redis)
- OR REDIS_HOST + REDIS_PORT

Example:

PORT=5000
JWT_SECRET=replace_with_strong_secret
MONGODB_URI=mongodb+srv://...
REDIS_URL=redis://default:password@host:6379
GEMINI_API_KEY=AIza...
FRONTEND_URL=https://your-frontend.example.com

### Frontend (frontend/.env.local)

- NEXT_PUBLIC_API_URL: backend API URL including /api
- NEXT_PUBLIC_SOCKET_URL: backend origin for websocket

Example:

NEXT_PUBLIC_API_URL=https://your-backend.example.com/api
NEXT_PUBLIC_SOCKET_URL=https://your-backend.example.com

## 3. Build Validation Checklist

Run from repository root:

1. Backend build

```powershell
Set-Location backend; npm install; npm run build
```

2. Frontend lint and build

```powershell
Set-Location ../frontend; npm install; npm run lint; npm run build
```

Expected:

- backend build succeeds
- frontend lint has zero errors
- frontend build succeeds

## 4. Upload Storage Behavior

Library uploads are stored in a single absolute backend folder:

- backend/uploads

Both static serving and multer now use the same directory to avoid missing-file issues in production.

## 5. Deployment Order

1. Provision MongoDB and Redis.
2. Deploy backend with environment variables.
3. Verify backend health endpoint: /api/health.
4. Deploy frontend with NEXT_PUBLIC_API_URL and NEXT_PUBLIC_SOCKET_URL.
5. Smoke test: login, create assignment, library upload, library delete, PDF preview/download.

## 6. Suggested Hosting Patterns

### Option A: Frontend on Vercel + Backend on Render/Railway

- Deploy backend first and copy backend URL.
- Set frontend env vars to backend URL.
- Set backend FRONTEND_URL to frontend URL.

### Option B: Single VPS (Nginx reverse proxy)

- Run backend on internal port (for example 5000).
- Run frontend on internal port (for example 3000).
- Route:
  - /api and websocket traffic -> backend
  - all other routes -> frontend

## 7. Post-Deploy Smoke Tests

1. Auth
- Register/login and verify protected routes.

2. Assignment generation
- Create assignment and confirm live progress updates.

3. Library
- Upload a file.
- Preview/download file.
- Delete file and confirm it disappears from UI and backend/uploads.

4. Stability
- Restart backend process and verify app reconnects.

## 8. Common Issues

- CORS failure: FRONTEND_URL does not match deployed frontend URL exactly.
- Socket connection failure: NEXT_PUBLIC_SOCKET_URL points to wrong host/protocol.
- Redis worker failure: REDIS_URL/REDIS_HOST invalid.
- Gemini errors: invalid GEMINI_API_KEY or quota exceeded.

## 9. Vercel Frontend + Render Backend

This section is the exact setup for your requested deployment model.

### 9.1 Deploy Backend on Render

You can deploy either with the Blueprint (`render.yaml`) or manual settings.

Blueprint path:

- `render.yaml` at repository root.

Manual Render Web Service settings:

- Root Directory: `backend`
- Build Command: `npm install && npm run build`
- Start Command: `npm run start`
- Health Check Path: `/api/health`
- Environment: `Node`

Required backend env vars on Render:

- `NODE_ENV=production`
- `JWT_SECRET=<strong-random-secret>`
- `MONGODB_URI=<your-mongodb-uri>`
- `GEMINI_API_KEY=<your-gemini-key>`
- `FRONTEND_URL=<your-vercel-frontend-url>`
- `REDIS_URL=<render-redis-internal-or-external-url>`

After deploy, copy backend URL (example):

- `https://ai-assessment-backend.onrender.com`

### 9.2 Deploy Frontend on Vercel

In Vercel project settings:

- Framework preset: `Next.js`
- Root Directory: `frontend`
- Build Command: `npm run build` (default is fine)
- Install Command: `npm install` (default is fine)

Set frontend env vars in Vercel:

- `NEXT_PUBLIC_API_URL=https://<your-render-backend>/api`
- `NEXT_PUBLIC_SOCKET_URL=https://<your-render-backend>`

Example:

- `NEXT_PUBLIC_API_URL=https://ai-assessment-backend.onrender.com/api`
- `NEXT_PUBLIC_SOCKET_URL=https://ai-assessment-backend.onrender.com`

### 9.3 Final Cross-Linking

Once Vercel gives your frontend URL, update Render backend env var:

- `FRONTEND_URL=https://<your-vercel-domain>`

Then redeploy backend so CORS is fully aligned.

### 9.4 Post-Deploy Verification (Critical)

1. Open backend health URL:
- `https://<render-backend>/api/health`

2. Open frontend URL and test:
- Login/register
- Create assignment and watch live progress
- Upload library file, preview, download, delete

3. If realtime updates fail but API works:
- Re-check `NEXT_PUBLIC_SOCKET_URL`
- Confirm backend is a Render Web Service (not static) and healthy
