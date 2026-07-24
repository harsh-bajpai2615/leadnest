import Link from "next/link";
import { CaptureForm } from "@/components/CaptureForm";

// Public landing page. Left: positioning. Right: the public capture form.
export default function Home() {
  return (
    <main className="mx-auto w-full max-w-6xl px-6 py-14">
      <nav className="flex items-center justify-between mb-14">
        <span className="text-lg font-bold tracking-tight">🪺 LeadNest</span>
        <Link href="/login" className="btn btn-ghost">
          Team sign in
        </Link>
      </nav>

      <div className="grid gap-12 md:grid-cols-2 md:items-center">
        <div>
          <p className="text-sm font-semibold text-[var(--brand)] uppercase tracking-wide">
            Lead management, minus the bloat
          </p>
          <h1 className="mt-3 text-4xl md:text-5xl font-bold tracking-tight leading-tight">
            Capture every lead. Lose none of them.
          </h1>
          <p className="mt-4 text-[var(--muted)] text-lg max-w-md">
            LeadNest turns a website enquiry into an assigned, tracked deal with
            a full activity trail — so your sales team always knows the next
            move and who owns it.
          </p>
          <ul className="mt-6 space-y-2 text-sm">
            <li>✅ Public capture form → instant pipeline entry</li>
            <li>✅ Assign owners, move stages, log every touch</li>
            <li>✅ Admin &amp; member roles with real permissions</li>
          </ul>
        </div>

        <div>
          <h2 className="text-lg font-semibold mb-3">Talk to sales</h2>
          <CaptureForm />
        </div>
      </div>
    </main>
  );
}
