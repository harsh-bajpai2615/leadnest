import type { Lead } from "@/lib/domain/types";
import type { Store } from "@/lib/store/store";

// API projection of a Lead. Adds the assignee's display name so the client
// never has to make a second call to render "assigned to X".
export interface LeadDTO extends Lead {
  assignedToName: string | null;
}

/**
 * Enrich a page of leads with assignee names in a single extra lookup,
 * avoiding an N+1 by resolving each distinct assignee id once.
 */
export async function toLeadDTOs(
  store: Store,
  leads: Lead[],
): Promise<LeadDTO[]> {
  const ids = [
    ...new Set(leads.map((l) => l.assignedToId).filter(Boolean)),
  ] as string[];

  const nameById = new Map<string, string>();
  await Promise.all(
    ids.map(async (id) => {
      const user = await store.findUserById(id);
      if (user) nameById.set(id, user.name);
    }),
  );

  return leads.map((lead) => ({
    ...lead,
    assignedToName: lead.assignedToId
      ? (nameById.get(lead.assignedToId) ?? null)
      : null,
  }));
}
