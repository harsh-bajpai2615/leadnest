import { AppError, forbidden, notFound } from "@/lib/domain/errors";
import {
  canAddNote,
  canAssignLead,
  canChangeStatus,
  canViewLeads,
} from "@/lib/domain/permissions";
import type {
  Activity,
  Lead,
  LeadStatus,
  Note,
  User,
} from "@/lib/domain/types";
import type {
  CreateLeadInput,
  ListLeadsFilter,
  Paginated,
  Store,
} from "@/lib/store/store";

export interface LeadDetail {
  lead: Lead;
  notes: Note[];
  activities: Activity[];
}

export interface UpdateLeadInput {
  status?: LeadStatus;
  // present key => change assignment; value null => unassign
  assignedToId?: string | null;
}

// All lead behaviour funnels through this service. Each mutating method takes
// the acting `User` and checks the permission policy BEFORE touching the store,
// then records an Activity so the audit trail is never bypassed.

export class LeadService {
  constructor(private readonly store: Store) {}

  /** Public capture form. No actor — creates a NEW, unassigned lead. */
  async capture(input: CreateLeadInput): Promise<Lead> {
    const lead = await this.store.createLead(input);
    await this.store.appendActivity({
      leadId: lead.id,
      actorId: null,
      type: "LEAD_CREATED",
      summary: `Lead captured from ${input.source || "website"}`,
      meta: { source: input.source ?? null },
    });
    return lead;
  }

  async list(
    actor: User,
    filter: ListLeadsFilter & { page: number; pageSize: number },
  ): Promise<Paginated<Lead>> {
    if (!canViewLeads(actor)) throw forbidden();
    return this.store.listLeads(filter);
  }

  async getDetail(actor: User, leadId: string): Promise<LeadDetail> {
    if (!canViewLeads(actor)) throw forbidden();
    const lead = await this.requireLead(leadId);
    const [notes, activities] = await Promise.all([
      this.store.listNotes(leadId),
      this.store.listActivities(leadId),
    ]);
    return { lead, notes, activities };
  }

  async changeStatus(
    actor: User,
    leadId: string,
    status: LeadStatus,
  ): Promise<Lead> {
    const lead = await this.requireLead(leadId);
    if (!canChangeStatus(actor, lead)) {
      throw forbidden("Only the assignee or an admin can change this lead");
    }
    if (lead.status === status) return lead;

    const updated = await this.store.updateLead(leadId, { status });
    await this.store.appendActivity({
      leadId,
      actorId: actor.id,
      type: "STATUS_CHANGED",
      summary: `${actor.name} moved status ${lead.status} → ${status}`,
      meta: { from: lead.status, to: status },
    });
    return updated;
  }

  async assign(
    actor: User,
    leadId: string,
    assigneeId: string | null,
  ): Promise<Lead> {
    if (!canAssignLead(actor)) {
      throw forbidden("Only an admin can assign leads");
    }
    const lead = await this.requireLead(leadId);

    if (assigneeId) {
      const assignee = await this.store.findUserById(assigneeId);
      if (!assignee) throw new AppError("VALIDATION", "Assignee does not exist");
    }
    if (lead.assignedToId === assigneeId) return lead;

    const updated = await this.store.updateLead(leadId, {
      assignedToId: assigneeId,
    });

    if (assigneeId) {
      const assignee = await this.store.findUserById(assigneeId);
      await this.store.appendActivity({
        leadId,
        actorId: actor.id,
        type: "ASSIGNED",
        summary: `${actor.name} assigned this lead to ${assignee?.name ?? "a user"}`,
        meta: { assignedToId: assigneeId },
      });
    } else {
      await this.store.appendActivity({
        leadId,
        actorId: actor.id,
        type: "UNASSIGNED",
        summary: `${actor.name} unassigned this lead`,
        meta: { assignedToId: null },
      });
    }
    return updated;
  }

  async addNote(actor: User, leadId: string, body: string): Promise<Note> {
    const lead = await this.requireLead(leadId);
    if (!canAddNote(actor, lead)) {
      throw forbidden("Only the assignee or an admin can add notes");
    }
    const note = await this.store.addNote({
      leadId,
      authorId: actor.id,
      body,
    });
    await this.store.appendActivity({
      leadId,
      actorId: actor.id,
      type: "NOTE_ADDED",
      summary: `${actor.name} added a note`,
      meta: { noteId: note.id },
    });
    return note;
  }

  private async requireLead(leadId: string): Promise<Lead> {
    const lead = await this.store.findLeadById(leadId);
    if (!lead) throw notFound("Lead not found");
    return lead;
  }
}
