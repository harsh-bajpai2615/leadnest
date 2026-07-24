import { requireUser } from "@/lib/auth/current-user";
import { canViewUsers } from "@/lib/domain/permissions";
import { forbidden } from "@/lib/domain/errors";
import { getServices } from "@/lib/services";
import { ok, withErrors } from "@/lib/http";
import { toPublicUser } from "@/lib/domain/types";

// GET /api/users — the user directory, used to populate the assignment picker.
// Admin-only, enforced on the server.
export async function GET() {
  return withErrors(async () => {
    const actor = await requireUser();
    if (!canViewUsers(actor)) throw forbidden("Admins only");

    const services = getServices();
    const users = (await services.store.listUsers()).map(toPublicUser);
    return ok({ users });
  });
}
