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

## Deploy to Render

1. Push repo to GitHub
2. Create a new **Blueprint** on Render and point to `render.yaml`
3. Set `NEXTAUTH_URL` to your Render web service URL (e.g. `https://tigerparent.onrender.com`)
4. Render provisions PostgreSQL and runs migrations on deploy

## Portals

- **Student**: `/student` — daily mission, lessons, practice, stylus scratchpad, rewards
- **Parent**: `/parent` — family dashboard, placement, work review, reports
- **Admin**: `/admin` — curriculum, problems, video approval

## Curriculum

Seeded for **Math** and **English**, grades 3–7, with ~15 problems per skill. Architecture supports K–12 expansion via admin without code changes.

## Core Loop

Teach → Practice → Track → Review Mistakes → Master → Advance → Periodic Review
