import { requireUser } from "@/lib/auth/current-user";
import { getServices } from "@/lib/services";
import { ok, parseJson, withErrors } from "@/lib/http";
import { addNoteSchema } from "@/lib/validation";

// POST /api/leads/:id/notes — add a timestamped note (auth + policy)
export async function POST(
  request: Request,
  ctx: RouteContext<"/api/leads/[id]/notes">,
) {
  return withErrors(async () => {
    const actor = await requireUser();
    const { id } = await ctx.params;
    const body = addNoteSchema.parse(await parseJson(request));
    const services = getServices();

    const note = await services.leads.addNote(actor, id, body.body);
    return ok({ note }, 201);
  });
}
