RUN: 20261102-1640-mobile-ui-audit
WORKSTREAM: WS-2: Meeting and admin row layout

OBJECTIVE
At 320px (iPhone SE size) the meeting page scrolls sideways by 8px, and small expander links ("Change time", "Change who's on …", "Edit …") look like plain grey text. Fix the row layout and give expanders a clear affordance.

TASK
1. src/app/g/[token]/m/[date]/page.tsx, function RoleHead (~line 292): its wrapper is an inline flex row `display:flex; alignItems:center; gap:12`. When the role row has one or two buttons as children (e.g. "Take it" + "I'll do it", or "I can't make it"), the row cannot wrap and becomes wider than the screen. Make it wrap: add `flexWrap: "wrap"` and make the avatar+text part keep a sensible minimum (e.g. the row-main gets `flex: "1 1 160px"` / minWidth 0) so the buttons drop onto their own line under the text on narrow screens, aligned to the left edge of the text or the row. Buttons must keep their full labels on one line.
2. Expander chevrons: for each `<details className="disclose">` whose `<summary className="small muted">` has only text, add a lucide `ChevronRight` icon (size 16, aria-hidden) BEFORE the text inside the summary, so the existing CSS rule `details.disclose[open] > summary svg { transform: rotate(90deg) }` rotates it when open. Locations:
   - src/app/g/[token]/m/[date]/page.tsx: "Change time" (~line 82) and "Change who's on {p.roleName}" (~line 188)
   - src/app/g/[token]/organiser/roles/page.tsx: "Edit {r.name}" (~line 82)
   - src/app/g/[token]/organiser/people/page.tsx: "Edit {first name}" (~line 75)
   - src/components/songs.tsx: "Edit" (~line 126)
   Do not change summaries that already have an icon (e.g. "Add a song you'll lead" with Plus) or non-"small muted" summaries.
3. src/app/g/[token]/organiser/roles/page.tsx (~line 84-98): the Save button (inside StateForm) and the "Retire this role" button (a separate <form action={setRoleActive}> with inline padding "8px 0 12px") stack awkwardly. Lay them out in one wrapping row with an 8px gap: e.g. wrap the StateForm's actions and the retire form so they read as one row of buttons, or move the retire form visually next to Save using a flex container around both forms. Keep them as two separate forms (different server actions). Keep bottom spacing before the next role (~12px).

CONTEXT
- Read the shared context file: /home/claude/e585-rostering/.orchestrator/runs/20261102-1640-mobile-ui-audit/briefs/common.md
- Use inline styles or existing classes only (`.actions` is `display:flex; flex-wrap:wrap; gap:8px; align-items:center`). Do NOT edit globals.css (another worker owns it).
- Existing imports: lucide-react is already used in these files (e.g. ArrowLeft, Plus); add ChevronRight to the imports.

INPUTS
The 4 files above; src/app/globals.css (read-only: .row, .row-main, .actions, details.disclose rules ~line 1274).

SCOPE
Writable: src/app/g/[token]/m/[date]/page.tsx, src/app/g/[token]/organiser/roles/page.tsx, src/app/g/[token]/organiser/people/page.tsx, src/components/songs.tsx
Read-only: everything else (another worker is editing globals.css, settings, me, who/[id] and setup pages at the same time)
Permitted special actions: run npm run typecheck, npm test; run the audit scripts and your own Playwright scripts against localhost:3005. Do NOT run npm run build.

ACCEPTANCE CRITERIA
1. At 320px, /g/6sns-bez8-ra27/m/2026-11-06 and /g/6sns-bez8-ra27/m/2026-11-13 have document scrollWidth <= 320 (audit script shows no "page scrolls sideways" for them), and role-row buttons are fully visible with one-line labels.
2. Every listed "small muted" expander summary renders a chevron svg that rotates when open.
3. On the Roles page, Save and "Retire this role" sit in one row (same top ± 2px at 390px) with consistent spacing.
4. npm run typecheck clean; npm test passes. Only writable files changed.

VERIFICATION
Run /var/tmp/e585shots.js with your own outdir and report the lines for the meeting pages, roles and people at 320 and 390. Report typecheck and test output.

STOP CONDITIONS
Stop and report BLOCKED if a fix needs edits to files outside Writable.
