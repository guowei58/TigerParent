# TigerParent

A mastery-based learning platform for students (tablet/stylus-first) with parent oversight and admin curriculum management.

## Stack

- Next.js 16 (App Router)
- React 19 + TypeScript
- Tailwind CSS 4
- Prisma + PostgreSQL
- NextAuth (credentials)

## Local Setup (Render Postgres — no Docker)

Same pattern as CenturyEggCredit: app runs locally, database is on Render.

### 1. Create Render PostgreSQL

Render Dashboard → **New +** → **PostgreSQL** → name it `tigerparent`.

Copy the **External Database URL** and add `?sslmode=require` if it is not already present.

### 2. Environment

Copy `.env.example` to `.env` and set:

```env
DATABASE_URL=postgresql://USER:PASSWORD@HOST/tigerparent?sslmode=require
AUTH_SECRET=your-random-secret
NEXTAUTH_URL=http://localhost:3001
PORT=3001
```

Your `.env` is already configured with your Render URL.

### 3. Install & Database

```bash
npm install
npm run db:setup:render
```

(`db:setup:render` runs `prisma migrate deploy` + seed — use this for remote Postgres; use `db:setup` only with local Docker Postgres.)

### 4. Run Dev Server

```bash
npm run dev
```

Open [http://localhost:3001](http://localhost:3001)

---

## Local Setup (Docker Postgres — optional)

If you prefer a fully local database:

### 1. Start PostgreSQL

Install [Docker Desktop](https://www.docker.com/products/docker-desktop/), then:

```bash
docker compose up -d
```

Set `DATABASE_URL=postgresql://postgres:postgres@localhost:5432/tigerparent?schema=public` in `.env`.

### 2. Migrate & seed

```bash
npm run db:setup
```

## Demo Account

Password: `demo1234`

| Role | Email |
|------|-------|
| Admin | admin@tigerparent.local |

## Deploy to Render (tigerparent.study)

The app code deploys automatically from GitHub. The database is on Render Postgres. **Practice question images** (~300 MB of PNGs) live in `data/` on your machine and must be copied to production separately — they are not in git.

### 1. Code deploy (Render)

1. Push the repo to GitHub
2. In [Render Dashboard](https://dashboard.render.com), connect the repo (or use **Blueprint** → `render.yaml`)
3. Set these environment variables on the **tigerparent** web service:

| Variable | Value |
|----------|-------|
| `NEXTAUTH_URL` | `https://tigerparent.study` |
| `AUTH_SECRET` | A long random string (keep stable — changing it logs everyone out) |
| `RESEND_API_KEY` | From [resend.com](https://resend.com) |
| `EMAIL_FROM` | `TigerParent <noreply@tigerparent.study>` |
| `ADMIN_EMAILS` | Your admin email(s), comma-separated |

Render runs `prisma migrate deploy` and `npm run build` on each deploy.

### 2. Practice images (pick one — required for PDF practice)

Without this step, topics load on tigerparent.study but question images show as broken icons.

#### Option A — Render persistent disk (no Cloudflare, stays on Render)

Best if Cloudflare billing fails. Costs ~**$7/mo** (Starter plan) + **$0.25/GB** disk.

1. Render Dashboard → **tigerparent** → **Settings** → change plan to **Starter**
2. **Disks** → Add disk: **1 GB**, mount path `/opt/render/project/src/data`
3. **Connect** → **SSH** → add your SSH public key
4. From your PC:

```powershell
$env:RENDER_SSH = "USER@ssh.xxx.render.com"   # from Render SSH tab
.\scripts\sync-pdf-assets-to-render.ps1
```

5. No `PDF_ASSETS_PUBLIC_BASE_URL` needed — images serve from `tigerparent.study/api/pdf-assets/...`

Re-run the sync script after importing new PDFs locally.

#### Option B — Backblaze B2 (free 10 GB, no Cloudflare)

1. Sign up at [backblaze.com/b2](https://www.backblaze.com/b2/cloud-storage.html)
2. Create a bucket `tigerparent-assets` → **Files in bucket are: Public**
3. **App Keys** → create key with read/write access
4. Add to local `.env`:

```env
S3_ENDPOINT=https://s3.us-west-004.backblazeb2.com
S3_ACCESS_KEY_ID=your_key_id
S3_SECRET_ACCESS_KEY=your_app_key
S3_BUCKET_NAME=tigerparent-assets
PDF_ASSETS_PUBLIC_BASE_URL=https://f000.backblazeb2.com/file/tigerparent-assets
```

(Use your bucket’s S3 endpoint and public URL from the B2 dashboard.)

5. `npm run assets:upload`
6. Set `PDF_ASSETS_PUBLIC_BASE_URL` on Render → redeploy

#### Option C — Cloudflare R2

Same flow as B2 but with `R2_*` env vars — only if Cloudflare activation succeeds.

### 3. Student accounts

Sign-up is closed — accounts are created manually (see `scripts/create-student-accounts.ts`). Students sign in at `/login`.

### 4. Verify production

Open a practice topic and confirm a question image loads. Or test directly:

`https://tigerparent.study/api/pdf-assets/pdf-crops/.../problem-006.png`

(with a real path from your DB — should return PNG, not 404)

## Portals

- **Student**: `/student` — daily mission, lessons, practice, stylus scratchpad, rewards (includes a Parents tab for progress sharing)
- **Admin**: `/admin` — curriculum, problems, video approval

## Curriculum

Seeded for **Math** and **English**, grades 3–7, with ~15 problems per skill. Architecture supports K–12 expansion via admin without code changes.

## Core Loop

Teach → Practice → Track → Review Mistakes → Master → Advance → Periodic Review
