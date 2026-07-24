"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { LEAD_STATUSES, type LeadStatus } from "@/lib/domain/types";

interface UserOption {
  id: string;
  name: string;
  role: string;
}

interface Props {
  leadId: string;
  currentStatus: LeadStatus;
  currentAssigneeId: string | null;
  canChangeStatus: boolean;
  canAssign: boolean;
  canAddNote: boolean;
  users: UserOption[]; // empty for non-admins
}

// Client-side controls for a single lead. Every action calls the JSON API,
// which re-checks the same permission policy on the server — the disabled
// states here are a UX nicety, not the security boundary.
export function LeadControls({
  leadId,
  currentStatus,
  currentAssigneeId,
  canChangeStatus,
  canAssign,
  canAddNote,
  users,
}: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState("");

  async function patch(body: Record<string, unknown>) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/leads/${leadId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const p = await res.json();
        setError(p?.error?.message ?? "Action failed.");
        return;
      }
      router.refresh();
    } catch {
      setError("Network error.");
    } finally {
      setBusy(false);
    }
  }

  async function submitNote(e: React.FormEvent) {
    e.preventDefault();
    if (!note.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/leads/${leadId}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: note }),
      });
      if (!res.ok) {
        const p = await res.json();
        setError(p?.error?.message ?? "Could not add note.");
        return;
      }
      setNote("");
      router.refresh();
    } catch {
      setError("Network error.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card p-4 space-y-4">
      <h2 className="font-semibold">Actions</h2>

      <div>
        <label className="block text-xs font-medium mb-1">Status</label>
        <select
          className="input"
          value={currentStatus}
          disabled={!canChangeStatus || busy}
          onChange={(e) => patch({ status: e.target.value })}
        >
          {LEAD_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        {!canChangeStatus && (
          <p className="mt-1 text-xs text-[var(--muted)]">
            Only the assignee or an admin can change status.
          </p>
        )}
      </div>

      {canAssign && (
        <div>
          <label className="block text-xs font-medium mb-1">Assigned to</label>
          <select
            className="input"
            value={currentAssigneeId ?? ""}
            disabled={busy}
            onChange={(e) =>
              patch({ assignedToId: e.target.value ? e.target.value : null })
            }
          >
            <option value="">Unassigned</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name} ({u.role})
              </option>
            ))}
          </select>
        </div>
      )}

      <form onSubmit={submitNote}>
        <label className="block text-xs font-medium mb-1">Add a note</label>
        <textarea
          className="input"
          rows={2}
          value={note}
          disabled={!canAddNote || busy}
          onChange={(e) => setNote(e.target.value)}
          placeholder={
            canAddNote
              ? "What happened on this lead?"
              : "Only the assignee or an admin can add notes."
          }
        />
        <button
          type="submit"
          className="btn btn-primary mt-2 w-full"
          disabled={!canAddNote || busy || !note.trim()}
        >
          {busy ? "Saving…" : "Add note"}
        </button>
      </form>

      {error && (
        <p className="text-sm text-red-500" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
