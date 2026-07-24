import { clearSessionCookie } from "@/lib/auth/session";
import { ok, withErrors } from "@/lib/http";

// POST /api/auth/logout -> clears the session cookie
export async function POST() {
  return withErrors(async () => {
    await clearSessionCookie();
    return ok({ ok: true });
  });
}
