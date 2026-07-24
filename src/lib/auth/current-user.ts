import { unauthenticated, forbidden } from "@/lib/domain/errors";
import type { Role, User } from "@/lib/domain/types";
import { getServices } from "@/lib/services";
import { readSessionFromCookies } from "./session";

// Server-side identity. Everything that needs "who is calling" goes through
// here — route handlers AND server components — so authorization is enforced on
// the server regardless of what the client sends. The cookie is httpOnly and
// signed, so it cannot be forged or read by client JS.

/** Returns the current user or null. Never throws. */
export async function getCurrentUser(): Promise<User | null> {
  const session = await readSessionFromCookies();
  if (!session) return null;
  // Re-load from the store so a deleted or role-changed user can't keep acting
  // on a still-valid token, and so role changes take effect immediately.
  const { auth } = getServices();
  return auth.getUserById(session.sub);
}

/** Throws 401 if not signed in. Use in protected route handlers. */
export async function requireUser(): Promise<User> {
  const user = await getCurrentUser();
  if (!user) throw unauthenticated();
  return user;
}

/** Throws 401 if not signed in, 403 if the role is not allowed. */
export async function requireRole(...roles: Role[]): Promise<User> {
  const user = await requireUser();
  if (!roles.includes(user.role)) throw forbidden();
  return user;
}
