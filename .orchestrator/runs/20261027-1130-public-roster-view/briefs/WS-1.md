RUN: 20261027-1130-public-roster-view
WORKSTREAM: WS-1: Public read-only roster

OBJECTIVE
The group's owner wants anyone who opens the site's plain address (no group code) to see who has which role, open slots, songs and which Fridays the group meets, read-only. Today `/` just says "This roster is private."

TASK
Build public read-only pages at `/` (home), `/m/[date]` (one meeting) and `/calendar`, with a public top bar that has a "Sign in" button linking to `/sign-in`. Make the shared roster/song components work when nobody is signed in, without changing how they behave for signed-in people.

CONTEXT
- Next.js 15 App Router, React 19, TypeScript, Drizzle + Postgres. Single group app: `firstGroup()` in src/lib/data.ts returns it. Run on Cloudflare Workers.
- The private app lives under `/g/[token]` (token = `group.linkToken`, the group's secret link). Signed-in identity: `currentPerson(group)` in src/lib/data.ts (cookie signed per person). Organiser = `me.access !== "member"`.
- THE TOKEN IS A SECRET. Public pages must never read `group.linkToken` or render it in HTML (no hrefs, no hidden fields, no props passed to client components). The only exception: on `/`, if `currentPerson(group)` returns a person, `redirect(`/g/${group.linkToken}`)` server-side (a redirect is fine; they are signed in). If no group exists, `/` still redirects to `/setup` (keep current behaviour from src/app/page.tsx).
- Create a route group `src/app/(public)/` with `layout.tsx` (public top bar: `Mark` + group name linking to `/`, inline links Home `/` and Calendar `/calendar`, and a "Sign in" button `/sign-in` styled like existing `.btn sm`), `page.tsx`, `m/[date]/page.tsx`, `calendar/page.tsx`. Move the root page into `(public)/page.tsx` and delete `src/app/page.tsx` (two pages for `/` would conflict). All public pages `export const dynamic = "force-dynamic"`.
- Copy the look of the existing private pages: src/app/g/[token]/page.tsx (home: "Who's serving" Window, Songs panel, "Later Fridays" list with MiniPanes/StatusPill), src/app/g/[token]/m/[date]/page.tsx (roster Window, Roles list with RoleHead, Songs), src/app/g/[token]/calendar/page.tsx (month panels of Fridays), and the header in src/app/g/[token]/layout.tsx. Use the existing CSS classes; add CSS to globals.css only if needed.
- Public pages show: role names, who has each (confirmed assignments only; treat `suggested` panes as open: auto-fill pencil-ins are not real yet), open slots as "Needs someone"/"Nobody yet" with NO button, songs (title, artist, key, who leads, open song slots) with NO edit/claim/add controls, and the calendar with NO Add/Call off. Greeting on home e.g. "Who's serving on Friday" style heading plus date/time lede. One prompt on home and meeting pages: "Have a PIN? Sign in to sign up" linking to `/sign-in`.
- Do NOT show availability (free/maybe/away), the "Who might take it" panel, the cover-message copy/share buttons, or the activity feed.
- Shared components: `Window` in src/components/ui.tsx already accepts `meId: number | null` and optional `me`; with no `openAction`/`me` it renders static panes. `SongSets` in src/components/songs.tsx requires `meId: number` and `token` and always renders the "Open a song slot" SaveForm in non-compact mode; add a read-only path (e.g. `meId: number | null` plus a `readOnly` prop, or render `compact` with `canEdit=false` and ensure no SaveForm/claim button renders). Signed-in callers under src/app/g/ must render exactly as before; do not edit files under src/app/g/.
- `myRoles(panes, null)` in src/lib/roster.ts already returns [].
- Another worker is building `/sign-in` in parallel; just link to it. Do not create src/app/sign-in.
- Style of the codebase: short doc comments, plain British English UI copy, no em dashes in UI text.

INPUTS
src/app/page.tsx, src/app/layout.tsx, src/app/g/[token]/layout.tsx, src/app/g/[token]/page.tsx, src/app/g/[token]/m/[date]/page.tsx, src/app/g/[token]/calendar/page.tsx, src/components/ui.tsx, src/components/songs.tsx, src/components/client.tsx, src/components/optimistic.tsx, src/lib/data.ts, src/lib/roster.ts, src/lib/dates.ts, src/app/globals.css

SCOPE
Writable: src/app/page.tsx (delete), src/app/(public)/**, src/components/ui.tsx, src/components/songs.tsx, src/lib/roster.ts, src/app/globals.css
Read-only: everything else, especially src/lib/actions.ts, src/lib/data.ts, src/db/**, src/app/g/**
Permitted special actions: run `npm run typecheck`, `npm test`, `npm run build` (dependencies are already installed). No commits, no installs.

OUTPUT
The files above. Report: files changed, how each acceptance criterion is met (file:line), verification output.

ACCEPTANCE CRITERIA
1. `/`, `/m/[date]`, `/calendar` render for a signed-out visitor using the first group; no SaveForm, AutoSeg, AutoSelect, ConfirmButton, StateForm or song edit form renders on them.
2. No file under src/app/(public)/ renders `linkToken` (only the signed-in redirect on `/` reads it); every link on public pages points to `/`, `/m/...`, `/calendar` or `/sign-in`.
3. Open slots show "Needs someone" / "Nobody yet" with no Take button; one "Sign in" button in the top bar and one "Have a PIN? Sign in to sign up" prompt on home and meeting pages.
4. A visitor with a valid sign-in cookie opening `/` is redirected to `/g/<token>`; no group yet still redirects to `/setup`.
5. No availability or "Who might take it" panel on public pages.
6. Files under src/app/g/ are unchanged and shared components keep their old behaviour when given a signed-in person.
7. src/lib/actions.ts and src/db/* unchanged; `npm run typecheck`, `npm test`, `npm run build` pass.

VERIFICATION
Run `npm run typecheck`, `npm test`, `npm run build` (build needs no database; pages are dynamic). All must exit 0. Run `grep -rn "linkToken\|token" "src/app/(public)"` and explain each hit. Run `git diff --stat` and confirm only writable files changed.

STOP CONDITIONS
Stop and report BLOCKED if: the build fails for reasons outside your files; meeting the criteria needs a change to src/lib/data.ts, src/lib/actions.ts or src/app/g/**; route conflicts cannot be resolved inside your writable files.
