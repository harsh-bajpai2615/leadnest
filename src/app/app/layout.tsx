import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/current-user";
import { LogoutButton } from "@/components/LogoutButton";

// Authenticated app shell. Server component: it resolves the current user and
// redirects to /login if there isn't one — so authorization is enforced on the
// server for every /app route, not just by middleware.
export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <div className="min-h-full">
      <header className="border-b border-[var(--border)] bg-[var(--surface)]">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
          <div className="flex items-center gap-6">
            <Link href="/app" className="font-bold tracking-tight">
              🪺 LeadNest
            </Link>
            <span className="text-xs text-[var(--muted)]">Pipeline</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right leading-tight">
              <p className="text-sm font-medium">{user.name}</p>
              <p className="text-xs text-[var(--muted)]">
                {user.email} · {user.role}
              </p>
            </div>
            <LogoutButton />
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-8">{children}</main>
    </div>
  );
}
