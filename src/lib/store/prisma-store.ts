import type { PrismaClient } from "@/generated/prisma/client";
import type { Activity, Lead, Note, StoredUser } from "@/lib/domain/types";
import { prisma as defaultPrisma } from "@/lib/prisma";
import type {
  AppendActivityInput,
  CreateLeadInput,
  ListLeadsOptions,
  Paginated,
  Store,
} from "./store";

// Production Store backed by Postgres via Prisma. All mapping from Prisma rows
// to plain domain objects happens here, so nothing downstream depends on the
// generated client's shapes.

type LeadRow = {
  id: string;
  name: string;
  email: string;
  company: string | null;
  phone: string | null;
  source: string | null;
  message: string | null;
  status: Lead["status"];
  assignedToId: string | null;
  createdAt: Date;
  updatedAt: Date;
};

function toLead(row: LeadRow): Lead {
  return { ...row };
}

export class PrismaStore implements Store {
  constructor(private readonly db: PrismaClient = defaultPrisma) {}

  async findUserByEmail(email: string): Promise<StoredUser | null> {
    return this.db.user.findUnique({ where: { email: email.toLowerCase() } });
  }

  async findUserById(id: string): Promise<StoredUser | null> {
    return this.db.user.findUnique({ where: { id } });
  }

  async listUsers(): Promise<StoredUser[]> {
    return this.db.user.findMany({ orderBy: { name: "asc" } });
  }

  async createUser(input: {
    email: string;
    name: string;
    role: "ADMIN" | "MEMBER";
    passwordHash: string;
  }): Promise<StoredUser> {
    return this.db.user.create({
      data: {
        email: input.email.toLowerCase(),
        name: input.name,
        role: input.role,
        password: input.passwordHash,
      },
    });
  }

  async createLead(input: CreateLeadInput): Promise<Lead> {
    const row = await this.db.lead.create({
      data: {
        name: input.name,
        email: input.email,
        company: input.company ?? null,
        phone: input.phone ?? null,
        source: input.source ?? null,
        message: input.message ?? null,
      },
    });
    return toLead(row);
  }

  async findLeadById(id: string): Promise<Lead | null> {
    const row = await this.db.lead.findUnique({ where: { id } });
    return row ? toLead(row) : null;
  }

  async listLeads(options: ListLeadsOptions): Promise<Paginated<Lead>> {
    const where: Record<string, unknown> = {};
    if (options.status) where.status = options.status;
    if (options.assignedToId !== undefined)
      where.assignedToId = options.assignedToId;
    if (options.search) {
      where.OR = [
        { name: { contains: options.search, mode: "insensitive" } },
        { email: { contains: options.search, mode: "insensitive" } },
        { company: { contains: options.search, mode: "insensitive" } },
      ];
    }

    const [rows, total] = await Promise.all([
      this.db.lead.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (options.page - 1) * options.pageSize,
        take: options.pageSize,
      }),
      this.db.lead.count({ where }),
    ]);

    return {
      items: rows.map(toLead),
      total,
      page: options.page,
      pageSize: options.pageSize,
    };
  }

  async updateLead(
    id: string,
    patch: Partial<Pick<Lead, "status" | "assignedToId">>,
  ): Promise<Lead> {
    const row = await this.db.lead.update({ where: { id }, data: patch });
    return toLead(row);
  }

  async addNote(input: {
    leadId: string;
    authorId: string;
    body: string;
  }): Promise<Note> {
    return this.db.note.create({ data: input });
  }

  async listNotes(leadId: string): Promise<Note[]> {
    return this.db.note.findMany({
      where: { leadId },
      orderBy: { createdAt: "desc" },
    });
  }

  async appendActivity(input: AppendActivityInput): Promise<Activity> {
    const row = await this.db.activity.create({
      data: {
        leadId: input.leadId,
        actorId: input.actorId,
        type: input.type,
        summary: input.summary,
        meta: (input.meta ?? undefined) as never,
      },
    });
    return {
      id: row.id,
      leadId: row.leadId,
      actorId: row.actorId,
      type: row.type,
      summary: row.summary,
      meta: (row.meta as Record<string, unknown> | null) ?? null,
      createdAt: row.createdAt,
    };
  }

  async listActivities(leadId: string): Promise<Activity[]> {
    const rows = await this.db.activity.findMany({
      where: { leadId },
      orderBy: { createdAt: "desc" },
    });
    return rows.map((row) => ({
      id: row.id,
      leadId: row.leadId,
      actorId: row.actorId,
      type: row.type,
      summary: row.summary,
      meta: (row.meta as Record<string, unknown> | null) ?? null,
      createdAt: row.createdAt,
    }));
  }
}
