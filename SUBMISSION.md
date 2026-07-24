# Digital Heroes — Full Stack Development (Role 04) — Harsh Bajpai

Both tasks for the Full Stack role. Everything is my own work; AI usage is
disclosed at the bottom and in the repo README.

## Task A — Build a lead platform, not a lead form

**LeadNest** — a lead-management app a small sales team could actually use.

- 🔗 **Live app:** https://leadnest-flame.vercel.app
- 💻 **GitHub repo:** https://github.com/harsh-bajpai2615/leadnest
- 📖 **API docs + architecture:** [README](https://github.com/harsh-bajpai2615/leadnest#readme)

**Demo logins** (password `Password123!`):

| Email | Role |
| --- | --- |
| `admin@leadnest.test` | Admin — assign leads, act on any lead |
| `mia@leadnest.test` | Member — acts on leads assigned to her |
| `rob@leadnest.test` | Member |

What it demonstrates against the rubric:

- **Architecture & data modeling** — thin route handlers → services → a `Store`
  interface (Prisma/Postgres in prod, in-memory in tests); append-only activity
  audit trail; enum-typed status/role; indexed access paths.
- **Auth & permission correctness** — JWT httpOnly-cookie sessions, bcrypt,
  ADMIN/MEMBER roles, a *pure permission policy* enforced on **both** client and
  server (and re-checked on every request), account-enumeration-safe login.
- **API design & docs** — JSON API with pagination, filtering, and correct
  status codes (401/403/404/422), fully documented in the README.
- **Test coverage & deployment** — 14 Vitest tests (policy, auth, 3 lead flows) +
  an optional real-Postgres integration test; deployed on Vercel + Neon (free
  tier). Verified end-to-end against the live database.

## Task B — Inherit and improve

Four documents in the repo under [`/task-b`](https://github.com/harsh-bajpai2615/leadnest/tree/main/task-b):

1. **Assessment** — what I'd fix, in what order, and the risk of leaving each.
2. **Phased migration plan** — strangler-fig, no big-bang: week 1 / month 1 / quarter 1.
3. **Before → after refactor** — a realistic bad handler I wrote, refactored into
   the Task A architecture, with commentary on what improved.
4. **Standards & adoption** — the few standards I'd introduce and how to get a
   resistant team to actually adopt them.

## Where I used AI

I used Claude (Anthropic) as a pair-programmer: it scaffolded the Next.js 16 /
Prisma 7 project and drafted boilerplate route handlers, the in-memory store, and
first-pass docs. Because Next 16 and Prisma 7 both shipped breaking changes
(async `cookies()`/`params`, the `middleware → proxy` rename, Prisma's required
driver adapter and new client generator), I read the framework docs and corrected
the generated code where the model's assumptions were stale. The decisions are
mine: the Store-interface seam that makes the services testable, the permission
policy as pure functions shared by client and server, writing the activity trail
inside the service, and the enumeration-safe login.
