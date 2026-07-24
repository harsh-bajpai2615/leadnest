import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth/current-user";
import { getServices } from "@/lib/services";
import { toLeadDTOs } from "@/lib/serialize";
import { AppError } from "@/lib/domain/errors";
import {
  canAddNote,
  canAssignLead,
  canChangeStatus,
  canViewUsers,
  isAdmin,
} from "@/lib/domain/permissions";
import { toPublicUser } from "@/lib/domain/types";
import { StatusBadge } from "@/components/StatusBadge";
import { LeadControls } from "@/components/LeadControls";
import { formatDateTime } from "@/lib/format";

export default async function LeadDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const actor = await requireUser();
  const { id } = await params;
  const services = getServices();

  let detail;
  try {
    detail = await services.leads.getDetail(actor, id);
  } catch (err) {
    if (err instanceof AppError && err.code === "NOT_FOUND") notFound();
    throw err;
  }

  const [lead] = await toLeadDTOs(services.store, [detail.lead]);
  const users = canViewUsers(actor)
    ? (await services.store.listUsers()).map(toPublicUser)
    : [];

  // Author names for notes/activity, resolved once.
  const actorIds = [
    ...new Set(
      [
        ...detail.notes.map((n) => n.authorId),
        ...detail.activities.map((a) => a.actorId),
      ].filter(Boolean) as string[],
    ),
  ];
  const nameById = new Map<string, string>();
  await Promise.all(
    actorIds.map(async (uid) => {
      const u = await services.store.findUserById(uid);
      if (u) nameById.set(uid, u.name);
    }),
  );

  return (
    <div>
      <Link href="/app" className="text-sm text-[var(--muted)] hover:underline">
        ← Back to leads
      </Link>

      <div className="mt-3 grid gap-6 lg:grid-cols-3">
        {/* Left: lead detail + timeline */}
        <div className="lg:col-span-2 space-y-6">
          <div className="card p-6">
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-2xl font-bold">{lead.name}</h1>
                <p className="text-[var(--muted)]">
                  {lead.company ? `${lead.company} · ` : ""}
                  {lead.email}
                </p>
              </div>
              <StatusBadge status={lead.status} />
            </div>
            <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <Info label="Phone" value={lead.phone ?? "—"} />
              <Info label="Source" value={lead.source ?? "—"} />
              <Info label="Assigned to" value={lead.assignedToName ?? "Unassigned"} />
              <Info label="Captured" value={formatDateTime(lead.createdAt)} />
            </dl>
            {lead.message && (
              <div className="mt-4">
                <p className="text-xs font-medium text-[var(--muted)] mb-1">
                  Message
                </p>
                <p className="text-sm">{lead.message}</p>
              </div>
            )}
          </div>

          {/* Notes */}
          <div className="card p-6">
            <h2 className="font-semibold mb-3">
              Notes ({detail.notes.length})
            </h2>
            {detail.notes.length === 0 ? (
              <p className="text-sm text-[var(--muted)]">No notes yet.</p>
            ) : (
              <ul className="space-y-3">
                {detail.notes.map((n) => (
                  <li
                    key={n.id}
                    className="border-l-2 border-[var(--brand)] pl-3"
                  >
                    <p className="text-sm">{n.body}</p>
                    <p className="text-xs text-[var(--muted)] mt-0.5">
                      {nameById.get(n.authorId) ?? "Someone"} ·{" "}
                      {formatDateTime(n.createdAt)}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Activity trail */}
          <div className="card p-6">
            <h2 className="font-semibold mb-3">Activity</h2>
            <ol className="space-y-3">
              {detail.activities.map((a) => (
                <li key={a.id} className="flex gap-3 text-sm">
                  <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[var(--brand)]" />
                  <div>
                    <p>{a.summary}</p>
                    <p className="text-xs text-[var(--muted)]">
                      {formatDateTime(a.createdAt)}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </div>

        {/* Right: actions (permission-aware) */}
        <div>
          <LeadControls
            leadId={lead.id}
            currentStatus={lead.status}
            currentAssigneeId={lead.assignedToId}
            canChangeStatus={canChangeStatus(actor, detail.lead)}
            canAssign={canAssignLead(actor)}
            canAddNote={canAddNote(actor, detail.lead)}
            users={users}
          />
          {!isAdmin(actor) && (
            <p className="mt-3 text-xs text-[var(--muted)]">
              You are a member. You can manage leads assigned to you.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-medium text-[var(--muted)]">{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}
