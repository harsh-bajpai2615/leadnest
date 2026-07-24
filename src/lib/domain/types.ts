// Domain types. These are deliberately decoupled from Prisma's generated types
// so the service layer can be tested against an in-memory store with no DB.
// The Prisma enums are re-exported as plain string unions.

export type Role = "ADMIN" | "MEMBER";

export type LeadStatus =
  | "NEW"
  | "CONTACTED"
  | "QUALIFIED"
  | "PROPOSAL"
  | "WON"
  | "LOST";

export const LEAD_STATUSES: LeadStatus[] = [
  "NEW",
  "CONTACTED",
  "QUALIFIED",
  "PROPOSAL",
  "WON",
  "LOST",
];

export type ActivityType =
  | "LEAD_CREATED"
  | "STATUS_CHANGED"
  | "ASSIGNED"
  | "UNASSIGNED"
  | "NOTE_ADDED";

export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
  createdAt: Date;
}

// The stored shape includes the password hash; never leaves the store layer.
export interface StoredUser extends User {
  password: string;
}

export interface Lead {
  id: string;
  name: string;
  email: string;
  company: string | null;
  phone: string | null;
  source: string | null;
  message: string | null;
  status: LeadStatus;
  assignedToId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Note {
  id: string;
  leadId: string;
  authorId: string;
  body: string;
  createdAt: Date;
}

export interface Activity {
  id: string;
  leadId: string;
  actorId: string | null;
  type: ActivityType;
  summary: string;
  meta: Record<string, unknown> | null;
  createdAt: Date;
}

// A safe public projection of a user (no password hash).
export function toPublicUser(u: User | StoredUser): User {
  return {
    id: u.id,
    email: u.email,
    name: u.name,
    role: u.role,
    createdAt: u.createdAt,
  };
}
