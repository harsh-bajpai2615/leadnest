import type { Activity, Lead, Note, StoredUser } from "@/lib/domain/types";
import type {
  AppendActivityInput,
  CreateLeadInput,
  ListLeadsOptions,
  Paginated,
  Store,
} from "./store";

// In-memory Store used by the test suite. Same semantics as PrismaStore
// (newest-first ordering, filtering, pagination) but with zero I/O, so the
// service and permission tests run in milliseconds and offline.

let counter = 0;
function id(prefix: string): string {
  counter += 1;
  return `${prefix}_${counter.toString().padStart(6, "0")}`;
}

export class MemoryStore implements Store {
  private users: StoredUser[] = [];
  private leads: Lead[] = [];
  private notes: Note[] = [];
  private activities: Activity[] = [];
  private clock = 0;

  // Monotonic timestamps keep ordering deterministic without relying on
  // Date.now() resolution (multiple writes can land in the same millisecond).
  private now(): Date {
    this.clock += 1;
    return new Date(Date.UTC(2026, 0, 1, 0, 0, 0, 0) + this.clock * 1000);
  }

  async findUserByEmail(email: string): Promise<StoredUser | null> {
    return (
      this.users.find((u) => u.email === email.toLowerCase()) ?? null
    );
  }

  async findUserById(userId: string): Promise<StoredUser | null> {
    return this.users.find((u) => u.id === userId) ?? null;
  }

  async listUsers(): Promise<StoredUser[]> {
    return [...this.users].sort((a, b) => a.name.localeCompare(b.name));
  }

  async createUser(input: {
    email: string;
    name: string;
    role: "ADMIN" | "MEMBER";
    passwordHash: string;
  }): Promise<StoredUser> {
    const user: StoredUser = {
      id: id("user"),
      email: input.email.toLowerCase(),
      name: input.name,
      role: input.role,
      password: input.passwordHash,
      createdAt: this.now(),
    };
    this.users.push(user);
    return user;
  }

  async createLead(input: CreateLeadInput): Promise<Lead> {
    const ts = this.now();
    const lead: Lead = {
      id: id("lead"),
      name: input.name,
      email: input.email,
      company: input.company ?? null,
      phone: input.phone ?? null,
      source: input.source ?? null,
      message: input.message ?? null,
      status: "NEW",
      assignedToId: null,
      createdAt: ts,
      updatedAt: ts,
    };
    this.leads.push(lead);
    return { ...lead };
  }

  async findLeadById(leadId: string): Promise<Lead | null> {
    const lead = this.leads.find((l) => l.id === leadId);
    return lead ? { ...lead } : null;
  }

  async listLeads(options: ListLeadsOptions): Promise<Paginated<Lead>> {
    let rows = [...this.leads];

    if (options.status) {
      rows = rows.filter((l) => l.status === options.status);
    }
    if (options.assignedToId !== undefined) {
      rows = rows.filter((l) => l.assignedToId === options.assignedToId);
    }
    if (options.search) {
      const q = options.search.toLowerCase();
      rows = rows.filter(
        (l) =>
          l.name.toLowerCase().includes(q) ||
          l.email.toLowerCase().includes(q) ||
          (l.company?.toLowerCase().includes(q) ?? false),
      );
    }

    rows.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    const total = rows.length;
    const start = (options.page - 1) * options.pageSize;
    const items = rows
      .slice(start, start + options.pageSize)
      .map((l) => ({ ...l }));

    return { items, total, page: options.page, pageSize: options.pageSize };
  }

  async updateLead(
    leadId: string,
    patch: Partial<Pick<Lead, "status" | "assignedToId">>,
  ): Promise<Lead> {
    const lead = this.leads.find((l) => l.id === leadId);
    if (!lead) throw new Error("lead not found");
    if (patch.status !== undefined) lead.status = patch.status;
    if (patch.assignedToId !== undefined)
      lead.assignedToId = patch.assignedToId;
    lead.updatedAt = this.now();
    return { ...lead };
  }

  async addNote(input: {
    leadId: string;
    authorId: string;
    body: string;
  }): Promise<Note> {
    const note: Note = {
      id: id("note"),
      leadId: input.leadId,
      authorId: input.authorId,
      body: input.body,
      createdAt: this.now(),
    };
    this.notes.push(note);
    return { ...note };
  }

  async listNotes(leadId: string): Promise<Note[]> {
    return this.notes
      .filter((n) => n.leadId === leadId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .map((n) => ({ ...n }));
  }

  async appendActivity(input: AppendActivityInput): Promise<Activity> {
    const activity: Activity = {
      id: id("act"),
      leadId: input.leadId,
      actorId: input.actorId,
      type: input.type,
      summary: input.summary,
      meta: input.meta ?? null,
      createdAt: this.now(),
    };
    this.activities.push(activity);
    return { ...activity };
  }

  async listActivities(leadId: string): Promise<Activity[]> {
    return this.activities
      .filter((a) => a.leadId === leadId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .map((a) => ({ ...a }));
  }
}
