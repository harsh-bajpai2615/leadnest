# 3. Before → after refactor

A realistic example of the inherited style: a single Next.js route handler that
does everything. I wrote this to mirror exactly the four problems from the
assessment — logic in the handler, direct DB access, no validation, no real auth,
and a hard-coded secret.

## Before

```ts
// app/api/leads/[id]/route.ts  — the inherited version
import { Client } from "pg";

// ❌ secret committed to the repo
const db = new Client({
  connectionString:
    "postgresql://app:S3cr3t!@prod-db.internal:5432/leads",
});
db.connect();

export async function PATCH(req, { params }) {
  const body = await req.json();

  // ❌ no auth: anyone who can reach this URL can reassign or close any lead
  // ❌ no validation: body.status / body.assignedToId are whatever was sent
  // ❌ business logic + raw SQL inline; status codes are an afterthought
  if (body.status) {
    await db.query("UPDATE leads SET status = '" + body.status +
      "' WHERE id = '" + params.id + "'"); // ❌ SQL injection
  }
  if (body.assignedToId) {
    await db.query(
      `UPDATE leads SET "assignedToId" = $1 WHERE id = $2`,
      [body.assignedToId, params.id]
    );
    // ❌ no activity/audit record — the change is invisible afterward
  }

  const { rows } = await db.query(
    `SELECT * FROM leads WHERE id = $1`, [params.id]
  );
  return Response.json(rows[0]); // ❌ 200 even if nothing matched / on error
}
```

### What's wrong (mapped to the assessment)

- **Secret in source** (#1) — the DB password ships in the repo.
- **Direct SQL from the request path with string concatenation** (#2, #5) —
  classic SQL injection on `status` and `id`.
- **No authorization** (#4) — any caller can mutate any lead; no notion of owner
  or admin.
- **No validation** (#5) — an invalid `status` corrupts data; a missing lead
  still returns `200`.
- **No audit trail** — the inherited app can't answer "who changed this and when".
- **Untestable** — you can't exercise this without a live database and a running
  server.

## After

The handler becomes *thin*: authenticate, validate, delegate, map errors. All
behaviour moves into a service that checks the permission policy and writes the
audit trail; the DB lives behind a `Store` interface. (This is the actual Task A
code in this repo — `src/app/api/leads/[id]/route.ts` + `src/lib/services/lead-service.ts`.)

```ts
// app/api/leads/[id]/route.ts — refactored
import { requireUser } from "@/lib/auth/current-user";
import { getServices } from "@/lib/services";
import { ok, parseJson, withErrors } from "@/lib/http";
import { updateLeadSchema } from "@/lib/validation";

export async function PATCH(request: Request, ctx: RouteContext<"/api/leads/[id]">) {
  return withErrors(async () => {
    const actor = await requireUser();                 // ✅ auth, server-side
    const { id } = await ctx.params;
    const body = updateLeadSchema.parse(await parseJson(request)); // ✅ 422 on bad input
    const services = getServices();

    if (body.assignedToId !== undefined)               // admin-only, checked in service
      await services.leads.assign(actor, id, body.assignedToId);
    if (body.status !== undefined)                     // ownership checked in service
      await services.leads.changeStatus(actor, id, body.status);

    const detail = await services.leads.getDetail(actor, id);
    return ok(detail);                                 // ✅ 404/403 thrown by the service
  });
}
```

```ts
// src/lib/services/lead-service.ts — where the logic actually lives
async changeStatus(actor: User, leadId: string, status: LeadStatus) {
  const lead = await this.requireLead(leadId);         // ✅ 404 if missing
  if (!canChangeStatus(actor, lead))                   // ✅ policy, one source of truth
    throw forbidden("Only the assignee or an admin can change this lead");
  if (lead.status === status) return lead;

  const updated = await this.store.updateLead(leadId, { status }); // ✅ parameterized
  await this.store.appendActivity({                    // ✅ audit trail, can't be skipped
    leadId, actorId: actor.id, type: "STATUS_CHANGED",
    summary: `${actor.name} moved status ${lead.status} → ${status}`,
    meta: { from: lead.status, to: status },
  });
  return updated;
}
```

## What improved, concretely

| Before | After |
| --- | --- |
| Secret hard-coded | Secret from env; DB client created lazily behind `Store` |
| String-built SQL (injectable) | Parameterized queries via Prisma, one layer down |
| No auth | `requireUser()` + a **pure, tested permission policy** |
| No validation, `200`-always | Zod → `422`; service throws `403`/`404`, mapped centrally |
| Silent changes | Every mutation appends an `Activity` audit row |
| Needs a live DB to run at all | Logic is unit-tested in-memory in milliseconds |
| ~20 untestable lines doing 5 jobs | Handler does 1 job (HTTP); logic is reusable + covered |

The point isn't that the "after" is prettier — it's that each defect from the
assessment is closed *structurally*, so it can't quietly come back the next time
someone adds an endpoint in a hurry.
