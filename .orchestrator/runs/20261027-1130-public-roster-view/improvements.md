# Improvement pass
Baseline: query logging could not be enabled on the throwaway Postgres (config reload denied in sandbox). Static evidence used instead.

IMP-1 · Performance
Finding: src/app/(public)/layout.tsx:9 and each public page (page.tsx:13, m/[date]/page.tsx:22, calendar/page.tsx:16) each call firstGroup(), so every public request runs the groups query twice.
Change: a request-scoped cached group lookup (React cache) in a new src/app/(public)/group.ts, used by the public layout and pages.
Impact: Medium. One fewer database round trip (Workers -> Hyperdrive -> Neon Singapore) per public page view.
Risk: Low. Same query, same result, request-scoped.
Verification: UNMEASURED; static count of groups lookups per request 2 -> 1; typecheck/build; render check.
Decision: EXECUTE.

IMP-2 · User experience
Finding: public top bar Home/Calendar links have no aria-current, so visitors can't see which page they're on (private tabs highlight the current tab via .tabs-inline a[aria-current="page"]).
Change: a small client nav component in src/app/(public)/ that sets aria-current from usePathname (Home active on / and /m/*, Calendar on /calendar).
Impact: Medium. Orientation and screen-reader current-page cue.
Risk: Low. Additive.
Verification: Playwright: aria-current="page" on Home at / and /m/<date>, on Calendar at /calendar.
Decision: EXECUTE.

IMP-3 · User experience
Finding: read-only open song slot says "Anyone can lead this one." (songs.tsx OpenSlot), but a visitor cannot take it there.
Change: in readOnly mode, the open slot sub-line reads "Sign in to lead this one." Signed-in text unchanged.
Impact: Low. Removes a dead-end expectation.
Risk: Low. readOnly path only.
Verification: Playwright: public meeting page shows "Sign in to lead this one."; member page still shows "Anyone can lead this one."
Decision: EXECUTE.

R-1 · User experience: signed-in people opening /calendar or /m/<date> on the public site still see "Sign in". Redirecting them changes a flow. RECOMMEND.
R-2 · Security: /sign-in/<id> reveals any active person's name by id, including people without a PIN. Names are already public on the roster, so low risk. RECOMMEND (could 404 no-PIN people).

## Results (orchestrator re-check, fresh Postgres + next start + Playwright)
IMP-1 KEPT: grep shows firstGroup only in (public)/group.ts; groups lookups per public request 2 -> 1 (UNMEASURED, static).
IMP-2 KEPT: aria-current=page on Home at / and /m/2026-10-30, on Calendar at /calendar.
IMP-3 KEPT: public meeting/home show "Sign in to lead this one."; member page unchanged (open slot shows "I'll lead it" control).
Regressions: none. Public pages 0 forms, no token in HTML; signed-out /g/<token> and organiser pages still redirect to who; suggested (auto-fill) names not shown publicly.
