"use client";

import { useState } from "react";

// Public lead capture form. Posts to the PUBLIC POST /api/leads endpoint.
// Shows inline field errors from the API's 422 validation response.

type FieldErrors = Record<string, string>;

export function CaptureForm() {
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setFormError(null);
    setFieldErrors({});

    const form = e.currentTarget;
    const data = Object.fromEntries(new FormData(form).entries());

    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (res.status === 201) {
        setDone(true);
        form.reset();
        return;
      }
      const payload = await res.json();
      if (res.status === 422 && Array.isArray(payload?.error?.details)) {
        const errs: FieldErrors = {};
        for (const issue of payload.error.details) {
          const key = issue.path?.[0];
          if (key && !errs[key]) errs[key] = issue.message;
        }
        setFieldErrors(errs);
      } else {
        setFormError(payload?.error?.message ?? "Something went wrong.");
      }
    } catch {
      setFormError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <div className="card p-6 text-center" role="status">
        <p className="text-lg font-semibold">Thanks — we&apos;ve got it. ✅</p>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Someone from the team will be in touch shortly.
        </p>
        <button
          className="btn btn-ghost mt-4"
          onClick={() => setDone(false)}
          type="button"
        >
          Submit another
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="card p-6 space-y-4" noValidate>
      <Field name="name" label="Full name" error={fieldErrors.name} required />
      <Field
        name="email"
        label="Work email"
        type="email"
        error={fieldErrors.email}
        required
      />
      <Field name="company" label="Company" error={fieldErrors.company} />
      <Field name="phone" label="Phone" error={fieldErrors.phone} />
      <div>
        <label htmlFor="message" className="block text-sm font-medium mb-1">
          What do you need?
        </label>
        <textarea
          id="message"
          name="message"
          rows={3}
          className="input"
          aria-invalid={Boolean(fieldErrors.message)}
        />
        {fieldErrors.message && (
          <p className="mt-1 text-xs text-red-500">{fieldErrors.message}</p>
        )}
      </div>
      <input type="hidden" name="source" value="website" />

      {formError && (
        <p className="text-sm text-red-500" role="alert">
          {formError}
        </p>
      )}
      <button type="submit" className="btn btn-primary w-full" disabled={submitting}>
        {submitting ? "Sending…" : "Request a call"}
      </button>
    </form>
  );
}

function Field({
  name,
  label,
  type = "text",
  error,
  required,
}: {
  name: string;
  label: string;
  type?: string;
  error?: string;
  required?: boolean;
}) {
  return (
    <div>
      <label htmlFor={name} className="block text-sm font-medium mb-1">
        {label}
        {required && <span className="text-red-500"> *</span>}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        className="input"
        aria-invalid={Boolean(error)}
      />
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  );
}
