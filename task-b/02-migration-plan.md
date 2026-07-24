# 2. Phased migration plan

Principle: **strangler-fig, not big-bang.** New code goes behind a boundary; old
code is replaced one endpoint at a time; the app never stops shipping and never
goes down. Every phase leaves the system in a working, deployable state.

## Week 1 — stop the bleeding (safety, no behaviour change)

Goal: remove the acute risks and build the net that makes everything after this
safe.

- **Rotate all committed secrets** and move them to environment variables. Add
  `gitleaks`/secret-scanning to CI so a secret can never be merged again.
- **Add CI** that runs on every push: typecheck + lint + tests (even if there are
  only three tests on day one). Red build = no merge.
- **Characterization tests** on the top 3 revenue-critical flows — tests that
  pin *current* behaviour so refactors can't silently change it.
- **Lock the DB down at the network layer**: stop exposing it to the public
  internet, rotate its credentials, and put the real client behind server-only
  code. Front-end DB calls still exist, but the door is no longer wide open.
- **Add structured logging + an uptime/error alert** so we're not blind during
  the work that follows.

_Exit criteria: no secrets in the repo, green CI on every push, alerts firing to
a channel, and a test that fails if checkout breaks._

## Month 1 — introduce the boundary (the important one)

Goal: kill "frontend talks to the DB" by standing up a real API and moving
traffic to it endpoint-by-endpoint.

- **Introduce a service + `Store` layer** (the Task A pattern): business logic and
  DB access move server-side, behind a typed interface. New endpoints are built
  this way from day one.
- **Strangler migration of the frontend's DB calls:** for each direct call, add a
  server API endpoint that wraps it, point the client at the endpoint, delete the
  client-side DB access. Ship each one independently; feature-flag anything
  risky. No endpoint waits on another.
- **Centralize auth**: one `requireUser()/requireRole()` check reused by every
  new endpoint, replacing copy-pasted checks as endpoints migrate.
- **Add input validation (Zod)** at each new endpoint boundary; standardize the
  error envelope and status codes as you go.

_Exit criteria: the highest-traffic and highest-risk data paths go through the
API; the browser no longer holds DB credentials; auth is enforced server-side on
every migrated route._

## Quarter 1 — pay down and prevent

Goal: finish the migration, make the good path the easy path, and prevent
regression.

- **Finish migrating remaining endpoints** off direct DB access and out of
  route-handler logic.
- **Backfill tests** to meaningful coverage on services and auth (target the
  policy layer at ~100%, services on the money paths).
- **Observability maturity**: request IDs, key business metrics, dashboards, and
  alert thresholds tied to the customer SLA.
- **Codify standards** ([04-standards.md](./04-standards.md)) and enforce the
  cheap ones in CI so they don't rely on human vigilance.
- **Add staging + migration-on-deploy** so schema changes are safe and rollbacks
  are one click.

_Exit criteria: no route handler contains business logic or a raw DB call; CI
enforces the standards; an on-call engineer can diagnose an incident from
dashboards alone._

## Sequencing rationale

Security first (it's already exploitable), then the **test net** (so the risky
work is survivable), then the **boundary** (the structural root cause — direct DB
access — which also makes logic-in-handlers and missing-auth fixable), then
**coverage and prevention**. Each phase is independently valuable: if the project
were paused after Week 1, the system would still be materially safer than it is
today.
