import { getServices } from "@/lib/services";
import { createSessionToken, setSessionCookie } from "@/lib/auth/session";
import { ok, parseJson, withErrors } from "@/lib/http";
import { loginSchema } from "@/lib/validation";

// POST /api/auth/login  -> sets httpOnly session cookie, returns the user
export async function POST(request: Request) {
  return withErrors(async () => {
    const body = loginSchema.parse(await parseJson(request));
    const { auth } = getServices();

    const user = await auth.verifyCredentials(body.email, body.password);
    const token = await createSessionToken({
      sub: user.id,
      role: user.role,
      email: user.email,
    });
    await setSessionCookie(token);

    return ok({ user });
  });
}
