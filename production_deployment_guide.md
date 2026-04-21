# Render Deployment Guide - BisaME / Osuani

Follow these steps to deploy your modernized system to Render.

## 1. Backend (FastAPI Web Service)

Use these environment variables in your **Backend Python Web Service** settings on Render.

### Environment Variables
| Key | Value (Example/Copy-Paste) |
| :--- | :--- |
| `OPENAI_API_KEY` | *Your OpenAI Key* |
| `DEEPSEEK_API_KEY` | *Your DeepSeek Key* |
| `DATABASE_URL` | *Your PostgreSQL Connection String (from Supabase/Render)* |
| `CORS_ORIGINS` | `["https://YOUR-FRONTEND-URL.onrender.com"]` |
| `ADMIN_SECRET` | `f2l-secret-master-2026` |
| `AUTH_SECRET_KEY` | *A long random string (e.g. `builtbybiogodfred`)* |
| `PYTHON_VERSION` | `3.11` |

### Render Settings
- **Root Directory**: `backend` (or empty if you use the monorepo build command)
- **Build Command**: `pip install -r requirements.txt`
- **Start Command**: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`

---

## 2. Frontend (Next.js Web Service)

Use these variables in your **Frontend Node.js Web Service** settings.

### Environment Variables
| Key | Value |
| :--- | :--- |
| `NEXT_PUBLIC_API_URL` | `https://YOUR-BACKEND-URL.onrender.com/api` |
| `NODE_VERSION` | `20` |

### Render Settings
- **Root Directory**: `web`
- **Build Command**: `npm install && npm run build`
- **Start Command**: `npm run start`

---

## 3. Important Notes for Production

> [!IMPORTANT]
> **NEXT_PUBLIC_API_URL**: 
> You MUST set this in the Render dashboard **before** you trigger the build. Next.js bakes these variables into the code during the build process. If you change it later, you must trigger a "Clear Cache and Redeploy".

> [!WARNING]
> **CORS_ORIGINS**: 
> If your frontend fails to load data with an "Authentication Error", check that your backend's `CORS_ORIGINS` includes your deployment URL exactly.

> [!TIP]
> **Database**: 
> If you don't provide a `DATABASE_URL`, the app will use `gh_shs.db` inside the Render disk. This file will be DELETED every time you redeploy. Always use a remote PostgreSQL database for production products.
