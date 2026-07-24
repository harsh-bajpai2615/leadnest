# Deploying LeadNest (free tier)

Target: **Vercel** (app) + **Neon** (Postgres). Both free. ~10 minutes.

## 1. Create a free Postgres (Neon)

1. Sign up at <https://neon.tech> → **New Project**.
2. Copy the **connection string** (the *pooled* one is fine for the app). It
   looks like:
   ```
   postgresql://USER:PASSWORD@ep-xxxx.region.aws.neon.tech/neondb?sslmode=require
   ```

## 2. Apply the schema + seed (run once, locally)

From the project root, pointing at the Neon URL:

```bash
# put the Neon URL in .env as DATABASE_URL, and set AUTH_SECRET
cp .env.example .env
# edit .env:
#   DATABASE_URL="postgresql://...neon.tech/neondb?sslmode=require"
#   AUTH_SECRET="$(openssl rand -hex 32)"

npx prisma migrate deploy   # creates the tables from prisma/migrations
npm run db:seed             # creates the 3 demo accounts + sample pipeline
```

## 3. Push to GitHub

```bash
git add -A
git commit -m "LeadNest: full stack lead platform"
git branch -M main
git remote add origin https://github.com/<you>/leadnest.git
git push -u origin main
```

## 4. Import on Vercel

1. <https://vercel.com> → **Add New… → Project** → import the `leadnest` repo.
2. Framework preset: **Next.js** (auto-detected). No build overrides needed —
   `npm run build` already runs `prisma generate`.
3. **Environment Variables** (Production + Preview):
   | Key | Value |
   | --- | --- |
   | `DATABASE_URL` | your Neon connection string |
   | `AUTH_SECRET` | the same 32-byte hex you generated |
4. **Deploy.**

## 5. Verify

- Open the deployment URL → submit the public capture form.
- Sign in at `/app` with `admin@leadnest.test` / `Password123!`.
- Confirm the seeded pipeline shows, assign a lead, change a status, add a note,
  and watch the activity timeline update.

## Notes

- **Use Neon's *pooled* connection string on Vercel.** Serverless functions each
  open their own connection, so on a direct (non-`-pooler`) host you can exhaust
  Postgres connections under load. Neon's dashboard offers a **Pooled connection**
  whose host contains `-pooler` — use that for `DATABASE_URL` in Vercel. (For
  one-off local `migrate deploy` / `db:seed`, the direct string is fine.)
- **Migrations on deploy:** this project runs `prisma migrate deploy` manually
  (step 2). To make Vercel apply migrations on every deploy instead, set the
  build command to `prisma migrate deploy && prisma generate && next build`.
- **`AUTH_SECRET` must be identical** everywhere it runs, or existing sessions
  won't verify. Keep it ≥ 16 chars.
- **Re-seeding** wipes leads/notes/activities/users and recreates the demo data;
  don't run `db:seed` against a DB with real data.
