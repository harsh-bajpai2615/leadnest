import type { Lead, Role, User } from "./types";

// ---------------------------------------------------------------------------
// Authorization policy — the single source of truth for "who can do what".
//
// These are PURE functions: no DB, no request objects. Every service action
// calls the matching `can*` predicate, and the API + UI both read from here so
// client and server can never drift. This module is exhaustively unit-tested.
//
// Policy (stated as an assumption per the brief — a small sales team):
//   • Public (no user)  -> may only submit a lead via the capture form.
//   • MEMBER            -> sees all leads; may change status / add notes ONLY
//                          on leads assigned to them; cannot assign leads or
//                          view the user directory.
//   • ADMIN             -> full control: assign/reassign, change status and add
//                          notes on ANY lead, and view the user directory.
// ---------------------------------------------------------------------------

export function isAdmin(user: Pick<User, "role">): boolean {
  return user.role === "ADMIN";
}

/** Whether a role is allowed to reach the authenticated application at all. */
export function canAccessApp(role: Role | undefined): boolean {
  return role === "ADMIN" || role === "MEMBER";
}

/** Any authenticated user may read the lead list and lead detail. */
export function canViewLeads(user: User): boolean {
  return canAccessApp(user.role);
}

/** Owner of a lead = the assignee. Admins are treated as owners of everything. */
export function ownsLead(user: User, lead: Pick<Lead, "assignedToId">): boolean {
  return isAdmin(user) || lead.assignedToId === user.id;
}

export function canChangeStatus(
  user: User,
  lead: Pick<Lead, "assignedToId">,
): boolean {
  return ownsLead(user, lead);
}

export function canAddNote(
  user: User,
  lead: Pick<Lead, "assignedToId">,
): boolean {
  return ownsLead(user, lead);
}

/** Only admins may assign or reassign a lead to a user. */
export function canAssignLead(user: User): boolean {
  return isAdmin(user);
}

/** Only admins may list the user directory (used for the assignment picker). */
export function canViewUsers(user: User): boolean {
  return isAdmin(user);
}
