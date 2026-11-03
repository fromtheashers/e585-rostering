# Improvement pass
Changed files: README.md, .env.example, src/app/layout.tsx, src/app/(public)/layout.tsx, src/app/setup/page.tsx, src/app/g/[token]/serving.ics/route.ts, src/app/g/[token]/me/page.tsx, src/app/globals.css.
Baseline: not measured (no performance-sensitive loop or payload in the changed code).

IMP-1 · Performance
Finding: root generateMetadata calls firstGroup() on every page; group pages already look the group up by token, so they make one extra small query (~1 round trip via Hyperdrive).
Change: pass the title from the group layout instead, or share one lookup.
Impact: Low. Risk: Medium (touches metadata on every route, group layout outside this run's title scope).
Decision: RECOMMEND. Fails "low-risk, verifiable inside changed files"; benefit too small to justify.

No safe improvements found.
