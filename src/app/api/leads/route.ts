import { requireUser } from "@/lib/auth/current-user";
import { getServices } from "@/lib/services";
import { ok, parseJson, withErrors } from "@/lib/http";
import { toLeadDTOs } from "@/lib/serialize";
import { captureLeadSchema, listLeadsQuerySchema } from "@/lib/validation";
import type { LeadStatus } from "@/lib/domain/types";

// GET /api/leads — authenticated list with pagination + filtering.
// Query params: status, assignedToId (id | "me" | "unassigned"), search, page, pageSize
export async function GET(request: Request) {
  return withErrors(async () => {
    const actor = await requireUser();
    const { searchParams } = new URL(request.url);
    const raw = Object.fromEntries(searchParams.entries());
    const q = listLeadsQuerySchema.parse(raw);

    // Translate the assignee filter into a store-level value.
    let assignedToId: string | null | undefined;
    if (q.assignedToId === "me") assignedToId = actor.id;
    else if (q.assignedToId === "unassigned") assignedToId = null;
    else assignedToId = q.assignedToId; // specific id or undefined (all)

    const services = getServices();
    const result = await services.leads.list(actor, {
      status: q.status as LeadStatus | undefined,
      assignedToId,
      search: q.search,
      page: q.page,
      pageSize: q.pageSize,
    });

    const items = await toLeadDTOs(services.store, result.items);
    return ok({
      items,
      page: result.page,
      pageSize: result.pageSize,
      total: result.total,
      totalPages: Math.max(1, Math.ceil(result.total / result.pageSize)),
    });
  });
}

// POST /api/leads — PUBLIC capture form. No auth. Creates a NEW lead.
export async function POST(request: Request) {
  return withErrors(async () => {
    const body = captureLeadSchema.parse(await parseJson(request));
    const services = getServices();

    const lead = await services.leads.capture({
      name: body.name,
      email: body.email,
      company: body.company || null,
      phone: body.phone || null,
      source: body.source || "website",
      message: body.message || null,
    });

    return ok({ lead }, 201);
  });
}
