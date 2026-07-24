# Task B — Inherit and improve

**Scenario:** I've inherited a working but poorly built codebase that serves real
customers and cannot go down. No tests. Business logic inside route handlers.
The frontend calls the database directly. Secrets are committed to the repo.

This folder is my response, in four parts:

1. **[01-assessment.md](./01-assessment.md)** — what I'd fix, in what order, and
   the risk of leaving each issue in place.
2. **[02-migration-plan.md](./02-migration-plan.md)** — a phased plan that never
   requires a big-bang rewrite: week 1, month 1, quarter 1.
3. **[03-refactor.md](./03-refactor.md)** — one concrete before→after refactor of
   a realistic bad handler I wrote, with commentary on what improved.
4. **[04-standards.md](./04-standards.md)** — the engineering standards I'd
   introduce and how I'd get a resistant team to actually adopt them.

A note on where I'm pointing: the **target state** these documents move toward is
the architecture of the Task A app in this same repo (thin handlers → services →
a `Store` interface, a pure permission policy, tests against an in-memory store).
So Task B isn't hypothetical — it's the migration path to something I actually
built and can walk through.

> AI usage for this task is disclosed in [`../README.md`](../README.md#where-i-used-ai).
