import type {
  Activity,
  ActivityType,
  Lead,
  LeadStatus,
  Note,
  StoredUser,
} from "@/lib/domain/types";

// The persistence contract the service layer depends on. Two implementations
// satisfy it: PrismaStore (Postgres, production) and MemoryStore (tests). The
// services never import Prisma directly, which is what keeps them unit-testable.

export interface CreateLeadInput {
  name: string;
  email: string;
  company?: string | null;
  phone?: string | null;
  source?: string | null;
  message?: string | null;
}

export interface ListLeadsFilter {
  status?: LeadStatus;
  assignedToId?: string | null; // null => unassigned only
  search?: string; // matches name/email/company
}

export interface ListLeadsOptions extends ListLeadsFilter {
  page: number; // 1-based
  pageSize: number;
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface AppendActivityInput {
  leadId: string;
  actorId: string | null;
  type: ActivityType;
  summary: string;
  meta?: Record<string, unknown> | null;
}

export interface Store {
  // Users
  findUserByEmail(email: string): Promise<StoredUser | null>;
  findUserById(id: string): Promise<StoredUser | null>;
  listUsers(): Promise<StoredUser[]>;
  createUser(input: {
    email: string;
    name: string;
    role: "ADMIN" | "MEMBER";
    passwordHash: string;
  }): Promise<StoredUser>;

  // Leads
  createLead(input: CreateLeadInput): Promise<Lead>;
  findLeadById(id: string): Promise<Lead | null>;
  listLeads(options: ListLeadsOptions): Promise<Paginated<Lead>>;
  updateLead(
    id: string,
    patch: Partial<Pick<Lead, "status" | "assignedToId">>,
  ): Promise<Lead>;

  // Notes & activity (append-only)
  addNote(input: {
    leadId: string;
    authorId: string;
    body: string;
  }): Promise<Note>;
  listNotes(leadId: string): Promise<Note[]>;
  appendActivity(input: AppendActivityInput): Promise<Activity>;
  listActivities(leadId: string): Promise<Activity[]>;
}
