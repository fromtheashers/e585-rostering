RUN: 20261027-1130-public-roster-view
WORKSTREAM: IMP-1: Public pages polish (one group lookup, current-page nav, visitor song-slot wording)

OBJECTIVE
The public read-only roster just shipped. Make it slightly faster and clearer without changing anything signed-in people see.

TASK
1. Performance: create src/app/(public)/group.ts exporting `publicGroup = cache(firstGroup)` (import `cache` from "react", `firstGroup` from "@/lib/data"; add `import "server-only";` at the top as src/lib/data.ts does). Replace every `firstGroup()` call in src/app/(public)/layout.tsx, src/app/(public)/page.tsx, src/app/(public)/m/[date]/page.tsx and src/app/(public)/calendar/page.tsx with `publicGroup()`. Result: one groups query per request instead of two.
2. UX: create src/app/(public)/nav.tsx, a "use client" component `PublicNav` that renders the existing `<nav className="tabs-inline always" aria-label="Main">` with Home (`/`) and Calendar (`/calendar`) links, setting `aria-current="page"` on Home when pathname is `/` or starts with `/m/`, and on Calendar when it starts with `/calendar`. Use `usePathname` from next/navigation. Use it in layout.tsx in place of the inline nav. Existing CSS `.tabs-inline a[aria-current="page"]` already styles it.
3. UX: in src/components/songs.tsx, `OpenSlot` currently says "Anyone can lead this one." Give it an optional `readOnly` prop; when true the sub-line reads "Sign in to lead this one." Pass `readOnly` only from the read-only path (`if (!leader && readOnly) return <OpenSlot readOnly />;` in SongRowBody). Every other OpenSlot use stays as it is.

CONTEXT
Next.js 15 App Router, React 19, TypeScript. Public pages live in src/app/(public)/ and must never render group.linkToken (only the server-side redirect in (public)/page.tsx uses it). Keep that. Match surrounding code style: short doc comments, British English, no em dashes in UI text.

INPUTS
src/app/(public)/layout.tsx, src/app/(public)/page.tsx, src/app/(public)/m/[date]/page.tsx, src/app/(public)/calendar/page.tsx, src/components/songs.tsx, src/components/client.tsx (useActiveTab for reference), src/lib/data.ts

SCOPE
Writable: src/app/(public)/**, src/components/songs.tsx
Read-only: everything else
Permitted special actions: run `npm run typecheck`, `npm test`, `npm run build`. No commits, no installs.

BASELINE
Static: 2 `firstGroup()` calls per public request (layout + page). Target 1 (both via the cached `publicGroup`).

OUTPUT
The edited files. Report files changed, each criterion with file:line evidence, verification output.

ACCEPTANCE CRITERIA
1. No `firstGroup(` call remains in src/app/(public)/ except inside group.ts; layout and pages use `publicGroup()`.
2. Public nav sets aria-current="page" on Home at / and /m/<date>, on Calendar at /calendar.
3. Read-only open song slot says "Sign in to lead this one."; all other OpenSlot renders unchanged.
4. No public file renders linkToken; no forms or buttons added to public pages.
5. `npm run typecheck`, `npm test`, `npm run build` exit 0.

VERIFICATION
Run the three commands; `grep -rn "firstGroup(" "src/app/(public)"`; `git diff --stat`.

STOP CONDITIONS
Stop and report BLOCKED if a change needs files outside the writable scope.
