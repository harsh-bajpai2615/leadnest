import { getCurrentUser } from "@/lib/auth/current-user";
import { ok, withErrors } from "@/lib/http";

// GET /api/auth/me -> the current user, or 401
export async function GET() {
  return withErrors(async () => {
    const user = await getCurrentUser();
    if (!user) {
      return ok({ error: { code: "UNAUTHENTICATED" } }, 401);
    }
    return ok({ user });
  });
}
