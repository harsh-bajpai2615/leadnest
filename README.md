# 🪺 LeadNest — a lead *platform*, not a lead form

A small lead-management app a real sales team could use: a public capture form
feeds an authenticated pipeline where leads are assigned to people, moved
through stages, annotated with notes, and tracked with a complete activity
trail. Two roles — **admin** and **member** — with permissions enforced on
**both the client and the server**.

Built for the Digital Heroes Full Stack task (Role 04, Task A).

**Live demo:** `<ADD_YOUR_VERCEL_URL_HERE>`
**Demo logins** (password `Password123!` for all): see [Accounts](#demo-accounts).

---

## Table of contents

- [What it does](#what-it-does)
- [Tech stack & why](#tech-stack--why)
- [Architecture](#architecture)
- [Data model](#data-model)
- [Permission model](#permission-model)
- [API reference](#api-reference)
- [Running locally](#running-locally)
- [Deploying (free tier)](#deploying-free-tier)
- [Tests](#tests)
- [Demo accounts](#demo-accounts)
- [Design decisions & assumptions](#design-decisions--assumptions)
- [Where I used AI](#where-i-used-ai)

---

## What it does

- **Public capture form** (`/`) → creates a `NEW`, unassigned lead. No login.
- **Team app** (`/app`, auth required):
  - Leads list with **search**, **status filter**, **assignment filter**, and pagination.
  - Lead detail with a **status pipeline**, **assignment**, **timestamped notes**, and an **activity timeline**.
- **JSON API** for everything the UI does, with pagination, filtering, and correct status codes.
- **Roles**: admins run the pipeline (assign, change any lead); members work the leads assigned to them.

## Tech stack & why

| Concern | Choice | Why |
| --- | --- | --- |
| Framework | **Next.js 16 (App Router)** | One codebase for UI, API, auth, and deploy — "the complete loop" in a single coherent product. |
| Language | **TypeScript** | Types across the DB boundary, the API, and the UI. |
| DB / ORM | **Postgres + Prisma 7** (pg driver adapter) | Relational data (leads → notes/activities) with migrations and a typed client. |
| Auth | **JWT in an httpOnly cookie** (`jose`) + **bcrypt** | Stateless, edge-compatible sessions; no session table to manage. |
| Validation | **Zod** | One schema per input; invalid requests become `422`s, never reach the DB. |
| Tests | **Vitest** | Fast unit + service-level flow tests against an in-memory store (no DB needed). |
| Hosting | **Vercel + Neon** | Both have a genuinely free tier; `git push` deploys. |

## Architecture

The guiding idea: **business logic never lives in a route handler, and the
database is an implementation detail behind an interface.**

```
Request
  → Route handler (src/app/api/**)         thin: parse + auth + map errors to HTTP
      → Service (src/lib/services/**)        all business logic + permission checks
          → Store interface (src/lib/store)  persistence contract
              → PrismaStore (Postgres)   ← production
              → MemoryStore (in-memory)  ← tests
```

- **`src/lib/domain/permissions.ts`** is the single source of truth for "who can
  do what" — pure functions, exhaustively unit-tested. The API *and* the UI both
  read from it, so client and server can never disagree.
- **`Store` interface** lets the exact same services run against Postgres in
  production and an in-memory store in tests. That is why the flow tests are
  fast, deterministic, and need no database.
- **Auth is enforced server-side** in `requireUser()` / `requireRole()`, used by
  every protected route handler *and* every protected server component. The
  Next.js proxy (`src/proxy.ts`) only does cheap redirects — it is **not** the
  security boundary.

## Data model

```
User (id, email, name, role[ADMIN|MEMBER], password[bcrypt], createdAt)
  └─ assignedLeads → Lead[]

Lead (id, name, email, company?, phone?, source?, message?,
      status[NEW|CONTACTED|QUALIFIED|PROPOSAL|WON|LOST],
      assignedToId? → User, createdAt, updatedAt)
  ├─ notes      → Note[]
  └─ activities → Activity[]

Note     (id, leadId, authorId, body, createdAt)
Activity (id, leadId, actorId?, type, summary, meta?, createdAt)   // append-only audit trail
```

- **`Activity` is the audit trail.** Every meaningful change — lead created,
  status changed, assigned/unassigned, note added — appends an `Activity` row,
  written *inside the service* so it can't be bypassed. The timeline is one
  indexed query, newest-first.
- Roles and statuses are **Postgres enums**, so invalid values are rejected by
  the database, not just the app.
- Indexes back the real access patterns: `leads(status)`, `leads(assignedToId)`,
  `leads(createdAt)`, `activities(leadId, createdAt)`.

## Permission model

Stated as an explicit assumption (a small sales team):

| Action | Public | Member | Admin |
| --- | :---: | :---: | :---: |
| Submit a lead (capture form) | ✅ | ✅ | ✅ |
| View leads list / detail | — | ✅ | ✅ |
| Change status / add note | — | **only if assigned to them** | ✅ any |
| Assign / reassign a lead | — | — | ✅ |
| View the user directory | — | — | ✅ |

Every rule is enforced in the service layer and covered by tests.

## API reference

Base URL: `/api`. All responses are JSON. Auth is via the `ln_session` httpOnly
cookie set by `POST /api/auth/login`.

Error envelope (all failures):

```json
{ "error": { "code": "FORBIDDEN", "message": "…", "details": [/* optional */] } }
```

Status codes: `200` ok · `201` created · `401` unauthenticated · `403`
forbidden · `404` not found · `422` validation · `500` internal.

### Auth

| Method & path | Auth | Body | Success |
| --- | --- | --- | --- |
| `POST /api/auth/login` | public | `{ email, password }` | `200 { user }` + sets cookie |
| `POST /api/auth/logout` | public | — | `200 { ok: true }` clears cookie |
| `GET /api/auth/me` | cookie | — | `200 { user }` or `401` |

### Leads

| Method & path | Auth | Notes |
| --- | --- | --- |
| `POST /api/leads` | **public** | Capture form. Body: `{ name, email, company?, phone?, source?, message? }` → `201 { lead }`. |
| `GET /api/leads` | member/admin | List. Query below. → `200 { items, page, pageSize, total, totalPages }`. |
| `GET /api/leads/:id` | member/admin | → `200 { lead, notes, activities }`. |
| `PATCH /api/leads/:id` | policy | Body: `{ status?, assignedToId? }` (`assignedToId: null` unassigns). Assignment is admin-only; status requires ownership. → `200 { lead, notes, activities }`. |
| `POST /api/leads/:id/notes` | policy | Body: `{ body }` → `201 { note }`. Requires ownership. |

`GET /api/leads` query params:

| Param | Values | Default |
| --- | --- | --- |
| `status` | `NEW…LOST` | all |
| `assignedToId` | a user id, `me`, or `unassigned` | all |
| `search` | matches name / email / company (case-insensitive) | — |
| `page` | integer ≥ 1 | `1` |
| `pageSize` | 1–100 | `20` |

### Users

| Method & path | Auth | Notes |
| --- | --- | --- |
| `GET /api/users` | **admin** | User directory for the assignment picker → `200 { users }`. |

**Example**

```bash
# 1) log in, keep the cookie
curl -c jar.txt -X POST $BASE/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@leadnest.test","password":"Password123!"}'

# 2) list qualified leads assigned to me, page 1
curl -b jar.txt "$BASE/api/leads?status=QUALIFIED&assignedToId=me&page=1"
```

## Running locally

```bash
git clone <repo-url> && cd leadnest
npm install
cp .env.example .env            # then set DATABASE_URL + AUTH_SECRET
npx prisma migrate deploy       # apply schema
npm run db:seed                 # create demo accounts + sample pipeline
npm run dev                     # http://localhost:3000
```

`AUTH_SECRET` can be generated with `openssl rand -hex 32`.

## Deploying (free tier)

See [`DEPLOY.md`](./DEPLOY.md) for the full step-by-step. In short: create a free
Neon Postgres, push this repo to GitHub, import it on Vercel, set `DATABASE_URL`
and `AUTH_SECRET`, and run `prisma migrate deploy` + `db:seed` once against the
Neon URL. `npm run build` runs `prisma generate` automatically.

## Tests

```bash
npm test          # 14 tests: permission policy, auth service, and 3 lead flows
```

- **`permissions.test.ts`** — the authorization policy, every rule.
- **`auth-service.test.ts`** — password verification, and that unknown-email vs
  wrong-password return the *same* error (no account enumeration).
- **`lead-flows.test.ts`** — capture → assign → work-the-lead, permission denials
  (403), missing lead (404), and list pagination + filtering.
- **`prisma-store.integration.test.ts`** — optional; runs the *real* Postgres
  query path when `TEST_DATABASE_URL` is set, skipped otherwise.

## Demo accounts

All use password **`Password123!`**.

| Email | Role |
| --- | --- |
| `admin@leadnest.test` | Admin |
| `mia@leadnest.test` | Member (has assigned leads) |
| `rob@leadnest.test` | Member (has assigned leads) |

## Design decisions & assumptions

- **In-memory store for tests, Prisma for prod, one interface for both.** The
  biggest architectural bet — it keeps the service layer pure and the tests
  offline and fast, and it doubles as a clean seam if a second data source ever
  shows up.
- **Members see all leads but can only *act* on their own.** A defensible
  default for a small team; trivially tightened to "see only mine" by changing
  one predicate.
- **Activity trail is append-only and written in the service**, never from the
  route handler — so the audit log can't drift from reality.
- **Same login error for wrong-password and unknown-email**, with a wasted hash
  cycle on the unknown path, to avoid leaking which emails have accounts.
- **The proxy is UX, not security.** All real authorization is re-checked
  server-side on every request.

## Where I used AI

I used Claude (Anthropic) as a pair-programmer throughout. It scaffolded the
Next.js 16 / Prisma 7 project and drafted the boilerplate route handlers, the
in-memory store, and the first pass of these docs. Because Next 16 and Prisma 7
both shipped breaking changes (async `cookies()`/`params`, the `middleware→proxy`
rename, Prisma's required driver adapter and the new `prisma-client` generator),
I read the bundled framework docs and corrected the generated code where the
model's assumptions were stale. The parts I own and would defend in an interview
are the **decisions**: the Store-interface seam that makes the services
testable, the permission policy as pure functions shared by client and server,
putting the activity trail inside the service, and the account-enumeration-safe
login. AI wrote a lot of the typing; the shape of the system is mine.
