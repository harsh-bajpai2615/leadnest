# 1. Assessment

## How I triaged

I ranked issues by **blast radius × likelihood × reversibility**, not by how ugly
the code is. The system serves real customers and can't go down, so the order is
driven by one question: *"if this fails at 2am, how bad is it and how fast can we
undo it?"* Security issues that are already live outrank cleanliness issues that
are merely embarrassing.

## Findings, in fix order

| # | Issue | Severity | Risk of leaving it | Fix cost |
| --- | --- | --- | --- | --- |
| 1 | **Secrets committed to the repo** | 🔴 Critical | Anyone with repo access (past employees, a leaked clone, a public fork) has prod DB/API credentials. This is a breach waiting to be reported, and git history means it's *already* exposed. | Low–Med |
| 2 | **Frontend calls the database directly** | 🔴 Critical | The DB is reachable from the client, which means credentials or a permissive tunnel are shipped to browsers. Any user can read/write arbitrary rows. There is effectively no authorization. | High |
| 3 | **No tests** | 🟠 High | Every change is a gamble on a system that can't go down. There's no safety net for the very refactors this list requires — so this is a *prerequisite*, not a cleanup. | Med (ongoing) |
| 4 | **Business logic inside route handlers** | 🟠 High | Logic can't be unit-tested, is duplicated across endpoints, and drifts. Authorization checks get copy-pasted and one copy inevitably rots. | Med |
| 5 | **No input validation / inconsistent status codes** | 🟡 Medium | Malformed input reaches the DB; clients can't program against the API reliably. Feeds injection and data-corruption bugs. | Low–Med |
| 6 | **No observability (logs/metrics/alerts)** | 🟡 Medium | You find out it's down from customers, not dashboards. Slows every incident. | Med |

## The two I'd start today

- **#1 (secrets):** rotate every committed credential *first* (rotation, not
  deletion, is the fix — the old values are already in history), move them to
  environment variables, and add secret scanning to CI so it can't recur.
- **#2 (direct DB from frontend):** this is the one that's actively dangerous in
  production. It gets the earliest *migration* attention (see the phased plan),
  but behind a real API boundary, introduced incrementally so nothing goes down.

## What I would explicitly *not* do

- **No rewrite.** The system works and earns money; a big-bang rewrite trades a
  known set of bugs for an unknown one and a months-long feature freeze.
- **No cosmetic refactors before tests exist.** Renaming and reshuffling code
  with no safety net is how you cause the outage you're trying to avoid.
- **No chasing 100% coverage.** I want tests on the money paths and the auth
  rules first; the long tail can wait.
