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

## Demo Accounts

Password for all demo accounts: `demo1234`

| Role | Email |
|------|-------|
| Admin | admin@tigerparent.local |
| Parent | parent@tigerparent.local |
| Student A (entering 4th grade) | studenta@tigerparent.local |
| Student B (entering 6th grade) | studentb@tigerparent.local |

## Deploy to Render (tigerparent.study)

The app code deploys automatically from GitHub. The database is on Render Postgres. **Practice question images are stored separately** — they live in `data/pdf-crops/` on your machine and must be uploaded to Cloudflare R2 for production.

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
| `PDF_ASSETS_PUBLIC_BASE_URL` | Your R2 public URL (step 2 below) |
| `ADMIN_EMAILS` | Your admin email(s), comma-separated |

Render runs `prisma migrate deploy` and `npm run build` on each deploy.

### 2. Practice images (Cloudflare R2 — required for PDF practice)

Without this step, topics load on tigerparent.study but question images show as broken icons.

1. **Cloudflare Dashboard** → R2 → Create bucket (e.g. `tigerparent-assets`)
2. **Settings → Public access** → Allow public access → copy the `https://pub-….r2.dev` URL  
   (Optional: add custom domain like `assets.tigerparent.study`)
3. **R2 → Manage R2 API Tokens** → Create token with Object Read & Write on that bucket
4. Add to your local `.env`:

```env
R2_ACCOUNT_ID=your_cloudflare_account_id
R2_ACCESS_KEY_ID=...
R2_SECRET_ACCESS_KEY=...
R2_BUCKET_NAME=tigerparent-assets
PDF_ASSETS_PUBLIC_BASE_URL=https://pub-xxxxxxxx.r2.dev
```

5. Upload images from your machine (~300 MB for crops + pages):

```bash
npm run assets:upload
```

6. Set `PDF_ASSETS_PUBLIC_BASE_URL` on Render to the same public URL → **Manual Deploy**

Re-run `npm run assets:upload` after importing new PDFs locally.

### 3. Student accounts

Kids sign in at `https://tigerparent.study/login` with accounts you create (email + password). Demo accounts from seed (`studenta@tigerparent.local` / `demo1234`) only exist if you ran seed against production DB.

To add students in production, use the admin portal or run seed/setup against the Render database.

### 4. Verify production

Open a practice topic and confirm a question image loads. Or test directly:

`https://tigerparent.study/api/pdf-assets/pdf-crops/.../problem-006.png`

(with a real path from your DB — should return PNG, not 404)

## Portals

- **Student**: `/student` — daily mission, lessons, practice, stylus scratchpad, rewards
- **Parent**: `/parent` — family dashboard, placement, work review, reports
- **Admin**: `/admin` — curriculum, problems, video approval

## Curriculum

Seeded for **Math** and **English**, grades 3–7, with ~15 problems per skill. Architecture supports K–12 expansion via admin without code changes.

## Core Loop

Teach → Practice → Track → Review Mistakes → Master → Advance → Periodic Review
