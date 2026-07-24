import { Suspense } from "react";
import Link from "next/link";
import { LoginForm } from "@/components/LoginForm";

export const metadata = { title: "Sign in — LeadNest" };

export default function LoginPage() {
  return (
    <main className="mx-auto w-full max-w-sm px-6 py-20">
      <Link href="/" className="text-lg font-bold tracking-tight">
        🪺 LeadNest
      </Link>
      <h1 className="mt-8 text-2xl font-bold">Team sign in</h1>
      <p className="mt-1 mb-6 text-sm text-[var(--muted)]">
        Sign in to manage your pipeline.
      </p>

      {/* useSearchParams() requires a Suspense boundary in Next 16. */}
      <Suspense fallback={<div className="card p-6">Loading…</div>}>
        <LoginForm />
      </Suspense>

      <div className="mt-6 card p-4 text-xs text-[var(--muted)]">
        <p className="font-semibold text-[var(--foreground)] mb-1">
          Demo accounts (password: <code>Password123!</code>)
        </p>
        <p>admin@leadnest.test — Admin</p>
        <p>mia@leadnest.test — Member</p>
      </div>
    </main>
  );
}
