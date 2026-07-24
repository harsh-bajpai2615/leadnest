# 4. Engineering standards & adoption

## The standards (deliberately few)

A standard nobody remembers isn't a standard. I'd introduce a **small** set,
most of them enforced by a machine so they don't depend on willpower.

### Enforced by CI (non-negotiable, automatic)

1. **No secrets in the repo.** Secret scanning (`gitleaks`) blocks the merge.
2. **Green build to merge.** Typecheck + lint + tests run on every PR; red = no merge.
3. **New code goes through the boundary.** Route handlers may not import the DB
   client directly or contain business logic — a lint rule / import boundary
   enforces "handlers call services, services use the `Store`."
4. **Validate at the edge.** Every endpoint parses its input with a schema.
5. **Migrations are reviewed and reversible.** Schema changes ship as migration
   files, never ad-hoc SQL against prod.

### Enforced by review (judgement calls)

6. **Tests with behaviour changes.** New logic ships with a test; bug fixes ship
   with the test that would have caught them.
7. **Authorization is server-side and centralized.** No new copy of an auth check.
8. **PRs are small and single-purpose.** Easier to review, safer to roll back.

Each rule traces directly to a defect in the assessment — I'm not importing a
generic checklist, I'm closing the specific holes this codebase has.

## Getting a resistant team to adopt them

Resistance is usually rational: people have been burned by process that slowed
them down without helping. So I'd earn it rather than mandate it.

- **Show, don't decree.** Land the Task-A-style refactor on one real endpoint,
  then use the next incident or bug to point at how the boundary + tests would
  have caught it. One concrete "this would have saved us Thursday" beats a
  policy doc.
- **Make the right way the easy way.** A scaffold/template for "new endpoint"
  that already wires validation + service + test means following the standard is
  *less* typing than not. Standards win when they reduce friction.
- **Automate the boring rules so review stays human.** Nobody argues with a
  linter. Moving secrets/format/boundary checks into CI removes them from code
  review, so reviews are about design, not nagging — which lowers the
  temperature.
- **Introduce them as a team, not a mandate.** Propose the list, invite the two
  loudest skeptics to cut it down and own a rule each. People enforce what they
  helped write.
- **Grandfather the old code.** Standards apply to *new and touched* code, never
  "stop and fix everything." That removes the fear that "clean up" means a
  quarter of unpaid migration, and it's exactly the strangler-fig approach from
  the migration plan.
- **Measure and show the trend.** Track flaky-deploy rate, incident count, and
  PR cycle time. When they improve, the standards defend themselves; if one
  doesn't earn its keep, drop it.

## The one-line version

Introduce the *fewest* standards that each close a real hole, automate the ones a
machine can check, prove them on one endpoint before asking for buy-in, and only
ever apply them to code people are already touching.
