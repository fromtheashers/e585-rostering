# Executive plan: 20261102-1640-mobile-ui-audit

## Objective
Stop form fields and buttons overlapping or spilling off the screen on phones (starting with Settings, where the time box runs into the time zone box on iPhone), and fix the other layout problems the audit found, so every screen sits cleanly at 320 to 430px wide.

## How I audited
Ran the app locally with a test group (8 people, 5 Fridays, songs, offers, a changed time), signed in as the owner, and captured all 17 screens at 390px (dark) and 320px (light) with Chromium. A script flagged any element overlapping another or running past the screen edge, and I reviewed every screenshot by eye.

## Findings
F1 · High · Settings (your screenshot): "Usual start time" and "Time zone" sit in a 2-column grid using `1fr 1fr`. A `1fr` column can't shrink below its content, and iPhone Safari draws a time box with a wide built-in minimum width, so the time box pushes into the time zone box. The labels also sit at different heights because the iPhone time box is a different height from the select. Chromium doesn't show it; Safari does. The same `1fr 1fr` pattern is on Me (Change my PIN) and the first-time PIN screen, and every `.input`/`.select` lacks `min-width: 0`, so any field can do this on iPhone (setup time box, song Title/Key row, the new per-Friday time box).
F2 · High · Meeting page at 320px (iPhone SE/mini size): the whole page scrolls sideways by 8px. Cause: in the Roles list, a role row with two buttons (e.g. "Take it" and "I'll do it") can't wrap, so it is wider than the screen.
F3 · Medium · Small "Change time", "Change who's on …", "Edit …" links under rows look like plain grey text with no sign they open. Other expanders in the app have an icon.
F4 · Low · Roles page: "Retire this role" sits alone under Save with uneven spacing.
Checked and fine: bottom tab bar never covers the last item; roster grid scrolls sideways inside its own box on purpose; home, calendar, Me, More, People, public pages, sign-in and setup have no overlaps at 320 or 390.

## Success criteria
1. No screen scrolls sideways at 320px or 390px (scripted check on all 17 screens).
2. The overlap script reports no overlaps between form fields, labels and buttons on any screen (ignoring the fixed tab bar).
3. With an iPhone-like wide time box simulated (time input forced to 190px minimum), Settings, setup, Me and the meeting page keep both columns inside the screen with labels on one line.
4. `npm run typecheck`, `npm test`, `npm run build` pass.

## Scope
In: CSS and layout markup for the issues above.
Out: new features, colour or font changes, wording changes beyond the expander labels, the roster grid design.

## Assumptions
- I can't run real iPhone Safari here, so F1 is fixed using the known Safari behaviour and verified with a simulation. You'll confirm on your phone after deploy.

## Workstreams
| ID | Workstream | Deliverable | Model | Reason for model | Depends on | Writable files |
|---|---|---|---|---|---|---|
| WS-1 | Form fields that can't overflow | Global input/select/time-box CSS, 2-column rows that shrink and stack on very narrow screens | sonnet | Precise, well-specified CSS | none | src/app/globals.css, src/app/g/[token]/organiser/settings/page.tsx, src/app/g/[token]/me/page.tsx, src/app/g/[token]/who/[id]/page.tsx, src/app/setup/page.tsx |
| WS-2 | Meeting and admin row layout | Role rows wrap, expander icons, Roles page button row | sonnet | Small markup changes with clear targets | none | src/app/g/[token]/m/[date]/page.tsx, src/app/g/[token]/organiser/roles/page.tsx, src/app/g/[token]/organiser/people/page.tsx, src/components/songs.tsx |

Planning, auditing and review: Opus (me). Building: Sonnet, as you asked.

## Execution order
Wave 1: WS-1 and WS-2 in parallel (no shared files).

## Acceptance criteria per workstream
WS-1
1. `.input` and `.select` have `min-width: 0`; time and date inputs get iPhone-safe styling (no built-in minimum width, left-aligned value, same height as other fields).
2. No `1fr 1fr` remains; 2-column field rows use `minmax(0, 1fr)` columns, top-aligned labels, and stack to one column below 360px.
3. Criteria 1 to 3 above hold for Settings, setup, Me and first-time PIN screens.
WS-2
1. Role rows on the meeting page wrap their buttons to a new line instead of widening the page; meeting page has no sideways scroll at 320px.
2. Every small "Change …"/"Edit …" expander shows a chevron that turns when opened (existing `details.disclose > summary svg` rule).
3. Save and "Retire this role" sit in one wrapping row.
4. typecheck, test and build pass.

## Risks and mitigations
- Safari-only bug can't be seen here: simulate the wide time box and ask you to check on your phone.
- Global CSS change could shift other screens: full 17-screen re-run before and after.

## Decisions taken
- Fix at the root (global field CSS) instead of patching Settings only. Rejected: one-off style on the Settings row. Trade-off: touches every form, so every screen gets re-checked.

## Improvement pass
Status: ON (application code). Up to 3 low-risk fixes inside the changed files; anything bigger is listed, not done.

## Cost
2 delivery workers (sonnet). Up to 3 improvement workers. 1 revision round each.
