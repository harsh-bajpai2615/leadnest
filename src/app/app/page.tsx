import Link from "next/link";
import { requireUser } from "@/lib/auth/current-user";
import { getServices } from "@/lib/services";
import { toLeadDTOs } from "@/lib/serialize";
import { StatusBadge } from "@/components/StatusBadge";
import { formatDateTime } from "@/lib/format";
import { LEAD_STATUSES, type LeadStatus } from "@/lib/domain/types";

// Leads dashboard. Renders server-side using the same service + policy the API
// uses. Filters are a plain GET form (works without JS); pagination is links.

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function first(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v;
}

export default async function LeadsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const actor = await requireUser();
  const sp = await searchParams;

  const status = first(sp.status) as LeadStatus | undefined;
  const assigned = first(sp.assigned); // "", "me", "unassigned"
  const search = first(sp.search) ?? "";
  const page = Math.max(1, Number(first(sp.page) ?? "1") || 1);
  const pageSize = 10;

  let assignedToId: string | null | undefined;
  if (assigned === "me") assignedToId = actor.id;
  else if (assigned === "unassigned") assignedToId = null;
  else assignedToId = undefined;

  const services = getServices();
  const result = await services.leads.list(actor, {
    status,
    assignedToId,
    search: search || undefined,
    page,
    pageSize,
  });
  const leads = await toLeadDTOs(services.store, result.items);
  const totalPages = Math.max(1, Math.ceil(result.total / pageSize));

  const buildQuery = (overrides: Record<string, string>) => {
    const qs = new URLSearchParams();
    if (status) qs.set("status", status);
    if (assigned) qs.set("assigned", assigned);
    if (search) qs.set("search", search);
    qs.set("page", String(page));
    for (const [k, v] of Object.entries(overrides)) qs.set(k, v);
    return `/app?${qs.toString()}`;
  };

  return (
    <div>
      <div className="flex items-baseline justify-between mb-4">
        <h1 className="text-2xl font-bold">Leads</h1>
        <p className="text-sm text-[var(--muted)]">
          {result.total} total · page {page} of {totalPages}
        </p>
      </div>

      {/* Filters: plain GET form, so it works even without client JS. */}
      <form
        method="GET"
        className="card p-4 mb-4 grid gap-3 sm:grid-cols-4 items-end"
      >
        <div>
          <label className="block text-xs font-medium mb-1">Search</label>
          <input
            name="search"
            defaultValue={search}
            placeholder="Name, email, company"
            className="input"
          />
        </div>
        <div>
          <label className="block text-xs font-medium mb-1">Status</label>
          <select name="status" defaultValue={status ?? ""} className="input">
            <option value="">All</option>
            {LEAD_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium mb-1">Assignment</label>
          <select name="assigned" defaultValue={assigned ?? ""} className="input">
            <option value="">Anyone</option>
            <option value="me">Assigned to me</option>
            <option value="unassigned">Unassigned</option>
          </select>
        </div>
        <button type="submit" className="btn btn-primary">
          Apply
        </button>
      </form>

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-[var(--background)] text-left text-xs text-[var(--muted)]">
            <tr>
              <th className="px-4 py-3 font-medium">Lead</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Assigned to</th>
              <th className="px-4 py-3 font-medium">Captured</th>
            </tr>
          </thead>
          <tbody>
            {leads.length === 0 && (
              <tr>
                <td
                  colSpan={4}
                  className="px-4 py-10 text-center text-[var(--muted)]"
                >
                  No leads match these filters.
                </td>
              </tr>
            )}
            {leads.map((lead) => (
              <tr
                key={lead.id}
                className="border-t border-[var(--border)] hover:bg-[var(--background)]"
              >
                <td className="px-4 py-3">
                  <Link
                    href={`/app/leads/${lead.id}`}
                    className="font-medium hover:underline"
                  >
                    {lead.name}
                  </Link>
                  <div className="text-xs text-[var(--muted)]">
                    {lead.company ? `${lead.company} · ` : ""}
                    {lead.email}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <StatusBadge status={lead.status} />
                </td>
                <td className="px-4 py-3 text-[var(--muted)]">
                  {lead.assignedToName ?? "—"}
                </td>
                <td className="px-4 py-3 text-[var(--muted)]">
                  {formatDateTime(lead.createdAt)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex items-center justify-between">
        {page > 1 ? (
          <Link
            href={buildQuery({ page: String(page - 1) })}
            className="btn btn-ghost"
          >
            ← Previous
          </Link>
        ) : (
          <span />
        )}
        {page < totalPages ? (
          <Link
            href={buildQuery({ page: String(page + 1) })}
            className="btn btn-ghost"
          >
            Next →
          </Link>
        ) : (
          <span />
        )}
      </div>
    </div>
  );
}
