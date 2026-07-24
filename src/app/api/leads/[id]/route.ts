import { requireUser } from "@/lib/auth/current-user";
import { getServices } from "@/lib/services";
import { ok, parseJson, withErrors } from "@/lib/http";
import { toLeadDTOs } from "@/lib/serialize";
import { updateLeadSchema } from "@/lib/validation";
import type { LeadStatus } from "@/lib/domain/types";

// GET /api/leads/:id — lead detail with notes + activity timeline (auth)
export async function GET(
  _request: Request,
  ctx: RouteContext<"/api/leads/[id]">,
) {
  return withErrors(async () => {
    const actor = await requireUser();
    const { id } = await ctx.params;
    const services = getServices();

    const detail = await services.leads.getDetail(actor, id);
    const [dto] = await toLeadDTOs(services.store, [detail.lead]);

    return ok({
      lead: dto,
      notes: detail.notes,
      activities: detail.activities,
    });
  });
}

// PATCH /api/leads/:id — change status and/or assignment (auth + policy)
export async function PATCH(
  request: Request,
  ctx: RouteContext<"/api/leads/[id]">,
) {
  return withErrors(async () => {
    const actor = await requireUser();
    const { id } = await ctx.params;
    const body = updateLeadSchema.parse(await parseJson(request));
    const services = getServices();

    // Assignment and status are separate authority checks; apply each only if
    // present. Both funnel through the service so the activity trail is written.
    if (body.assignedToId !== undefined) {
      await services.leads.assign(actor, id, body.assignedToId);
    }
    if (body.status !== undefined) {
      await services.leads.changeStatus(actor, id, body.status as LeadStatus);
    }

    const detail = await services.leads.getDetail(actor, id);
    const [dto] = await toLeadDTOs(services.store, [detail.lead]);
    return ok({
      lead: dto,
      notes: detail.notes,
      activities: detail.activities,
    });
  });
}
