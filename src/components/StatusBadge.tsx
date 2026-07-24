import type { LeadStatus } from "@/lib/domain/types";

const STYLES: Record<LeadStatus, string> = {
  NEW: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200",
  CONTACTED: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200",
  QUALIFIED:
    "bg-violet-100 text-violet-700 dark:bg-violet-900 dark:text-violet-200",
  PROPOSAL:
    "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-200",
  WON: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-200",
  LOST: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-200",
};

export function StatusBadge({ status }: { status: LeadStatus }) {
  return (
    <span
      className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${STYLES[status]}`}
    >
      {status}
    </span>
  );
}
