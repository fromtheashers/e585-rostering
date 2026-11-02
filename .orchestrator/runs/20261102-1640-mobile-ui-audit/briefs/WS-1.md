RUN: 20261102-1640-mobile-ui-audit
WORKSTREAM: WS-1: Form fields that can't overflow

OBJECTIVE
On iPhone Safari the Settings "Usual start time" time box spills into the "Time zone" box next to it, and the two labels sit at different heights. Fix the root cause for every form so no field can overflow its column on phones.

TASK
1. In src/app/globals.css, Forms section (around `.input, .select` at ~line 799):
   a. Add `min-width: 0;` and `max-width: 100%;` to `.input, .select`. Give them a fixed `height: var(--tap)` (keep min-height) EXCEPT textarea if any uses .input (check; do not break textareas or `.input.pin`).
   b. Add iPhone-safe time/date styling: `input.input[type="time"], input.input[type="date"] { -webkit-appearance: none; appearance: none; display: block; min-width: 0; line-height: var(--tap) or equivalent so text is vertically centred; text-align: left; }` and `input.input[type="time"]::-webkit-date-and-time-value, input.input[type="date"]::-webkit-date-and-time-value { text-align: left; margin: 0; min-height: 1.2em; }`. Keep the calendar/clock picker usable (do not hide ::-webkit-calendar-picker-indicator).
   c. Add a reusable class `.field-pair`: `display: grid; gap: 10px; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); align-items: start;` and `@media (max-width: 359px) { .field-pair { grid-template-columns: minmax(0, 1fr); } }`. Children `.field` inside it get `min-width: 0`.
   d. Add `.form-row > * { min-width: 0; }` but keep buttons in .form-row from shrinking below their text (e.g. `.form-row > .btn { min-width: max-content; }` or white-space: nowrap on them). Check the existing .btn rules first.
2. Replace every inline `className="form-row" style={{ gridTemplateColumns: "1fr 1fr" }}` with `className="field-pair"` (no inline style) in:
   - src/app/g/[token]/organiser/settings/page.tsx (start time + time zone)
   - src/app/g/[token]/me/page.tsx (New PIN + Type it again)
   - src/app/g/[token]/who/[id]/page.tsx (New PIN + Type it again)
3. src/app/setup/page.tsx: only touch it if its time field or layout needs the same treatment; otherwise leave it.

CONTEXT
- Root cause: CSS grid `1fr` = `minmax(auto, 1fr)`, so a column cannot shrink below its content's min width; iOS Safari gives <input type="time"> a large intrinsic min width and its own height, so the input overflows into the neighbour and labels misalign (form-row uses align-items:end).
- Chromium does not reproduce the iOS width. To simulate it, inject CSS `input[type=time]{min-width:190px !important}` is NOT valid for the fix check because min-width:0 would be overridden; instead simulate with `input[type=time]{width:190px}` on the pre-fix code to see the overflow, and after the fix verify with a Playwright page at 320px and 390px that on /g/6sns-bez8-ra27/organiser/settings the time input's right edge <= the select's left edge - 8px, both labels have the same top (±1px), and document scrollWidth <= viewport width. Write your verification script under /var/tmp/ws1-*.js.
- Read the shared context file: /home/claude/e585-rostering/.orchestrator/runs/20261102-1640-mobile-ui-audit/briefs/common.md

INPUTS
src/app/globals.css (Forms section, .btn rules, .form-row), the 3 pages above, src/app/setup/page.tsx, src/components/songs.tsx (read-only: uses form-row with minmax(0,1fr) 110px).

SCOPE
Writable: src/app/globals.css, src/app/g/[token]/organiser/settings/page.tsx, src/app/g/[token]/me/page.tsx, src/app/g/[token]/who/[id]/page.tsx, src/app/setup/page.tsx
Read-only: everything else (another worker is editing src/app/g/[token]/m/[date]/page.tsx, organiser/roles, organiser/people and src/components/songs.tsx at the same time; do not touch them)
Permitted special actions: run npm run typecheck, npm test; run the audit scripts and your own Playwright scripts against localhost:3005. Do NOT run npm run build (another worker is editing files; the orchestrator will build).

ACCEPTANCE CRITERIA
1. .input and .select have min-width: 0; time/date inputs get iPhone-safe styling (appearance none, left-aligned value, same height as other fields).
2. No `gridTemplateColumns: "1fr 1fr"` remains in the 3 pages; they use .field-pair (minmax(0,1fr) columns, top-aligned, one column below 360px).
3. Settings verification script passes at 320 and 390 (no overlap, labels aligned, no sideways scroll), also with the time input forced to width 190px to simulate iPhone.
4. /var/tmp/e585shots.js shows no sideways scroll and no field/label/button overlaps on Settings, setup, Me, who/[id] screens at 320 and 390 (ignoring tab bar artefacts).
5. npm run typecheck clean; npm test passes. Only writable files changed.

VERIFICATION
Run the commands above and report actual output. Include before/after numbers from your settings script.

STOP CONDITIONS
Stop and report BLOCKED if a fix needs edits to files outside Writable.
