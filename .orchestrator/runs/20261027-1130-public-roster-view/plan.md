# Executive plan: 20261027-1130-public-roster-view (revision 2)

## Objective
Opening the site's plain address (no group code) shows a public, read-only roster: who has which role, open slots and songs. From that page, people who already have a PIN can sign in and get their usual powers.

## Success criteria
1. `/`, `/m/<date>` and `/calendar` with no sign-in cookie show the group's roster read-only (role names, who has them, open slots, songs, which Fridays we meet).
2. Public pages show no buttons that change data and never put the group code (link token) in the page HTML.
3. Public pages have a "Sign in" button. `/sign-in` lists people who already made a PIN; entering the right PIN signs you in and takes you to the full app at `/g/<token>`. Five wrong tries still lock that address out for ten minutes.
4. Making a PIN for the first time (claiming a name) still needs the group link. The public sign-in refuses people with no PIN and says to use the group link.
5. Someone already signed in who opens `/` goes straight to the full app.
6. Everything under `/g/<token>` works exactly as before; "Who are you?" gains a "Just looking? See the roster" link to `/`.
7. Server actions still reject any change without a signed-in person. No database change.
8. `npm run typecheck`, `npm test` and `npm run build` pass.

## Scope
In: public home, meeting and calendar pages at the site root; a public top bar with Sign in; `/sign-in` and `/sign-in/<id>`; a new public sign-in server action; shared roster pieces made to work with nobody signed in.
Out (non-goals): visitors seeing who is free or away; claiming a name from the public page; search engines listing the page (already blocked with noindex); any database change; the bare-address view under `/g/<token>` for signed-out people (they keep getting "Who are you?").

## Assumptions
- The app has one group, so the public page shows the first group (the app already works this way at `/`).
- Anyone on the internet who finds the address can see first names and roles. That's what you asked for; noindex keeps it out of Google.
- First-time PIN setup stays behind the group link, so a stranger can't claim someone's name from the public page.

## Workstreams
| ID | Workstream | Deliverable | Model | Reason for model | Depends on | Writable files |
|---|---|---|---|---|---|---|
| WS-1 | Public read-only roster | `/`, `/m/[date]`, `/calendar` public pages and top bar; shared roster pieces accept nobody signed in | sonnet | Well-specified UI build reusing existing components | none | src/app/page.tsx, src/app/(public)/**, src/components/ui.tsx, src/components/songs.tsx, src/lib/roster.ts, src/app/globals.css |
| WS-2 | Public PIN sign-in | `/sign-in`, `/sign-in/[id]`, `signInPublic` action sharing the existing PIN check and lockout | opus | Touches sign-in and lockout logic: security risk | none | src/lib/actions.ts, src/app/sign-in/**, src/app/g/[token]/who/page.tsx |

## Execution order
Wave 1: WS-1, WS-2 (parallel; writable files do not overlap. WS-1 links to `/sign-in`; WS-2 links back to `/`.)

## Acceptance criteria per workstream
WS-1
1. `/`, `/m/[date]`, `/calendar` render for a signed-out visitor using the first group; no SaveForm, AutoSeg, AutoSelect, ConfirmButton or song edit form renders on them.
2. No public file reads or renders `linkToken`; every link on public pages points to `/`, `/m/...`, `/calendar` or `/sign-in`.
3. Open slots say "Needs someone" / "Nobody yet" with no Take button; the page shows one "Sign in" button in the top bar and one "Have a PIN? Sign in to sign up" prompt.
4. A visitor with a valid sign-in cookie opening `/` is redirected to `/g/<token>`; no group yet still redirects to `/setup`.
5. No availability or "Who might take it" panel on public pages.
6. Files under `src/app/g/` render the same for signed-in people (shared components keep their old behaviour when given a person).

WS-2
1. `/sign-in` lists only active people with a PIN; with none, it says to use the group link.
2. `signInPublic` uses the first group, refuses people without a PIN, applies the same lockout (`guessState`/`wrongGuess`/`clearGuesses`) and PIN rehash as `signIn`, then redirects to `/g/<token>`.
3. Shared PIN-check code is factored so `signIn` behaves exactly as before.
4. "Who are you?" has a "Just looking? See the roster" link to `/`.
5. The token is never sent to the browser on `/sign-in` pages (no hidden token field).

Both: `src/db/*` unchanged; `npm run typecheck`, `npm test`, `npm run build` pass.

## Risks and mitigations
- Token leak on public pages makes the group link pointless: grep public files for `linkToken`/`token`, and render-check the HTML if I can start a throwaway database.
- Weakened lockout: WS-2 reuses the existing lockout helpers; I review the diff line by line.
- Signed-in experience regressing: shared component changes default to the old behaviour; review diff.
- No local database: I'll try a throwaway Postgres in Docker for a real render check; otherwise I rely on typecheck, build and review, and say so.

## Decisions taken
- Public pages live at the root with their own links (no code in URLs). Rejected: showing `/g/<token>` publicly. Trade-off: some page code is shared rather than identical routes.
- Public sign-in only for existing PINs. Rejected: claiming names from the public page. Trade-off: a newcomer still needs the group link once.
- Signed-out visitors to `/g/<token>` keep getting "Who are you?" (earlier visitor-mode idea dropped, the public page covers it).

## Improvement pass
Status: ON (the deliverable is application code)
After delivery checks pass, up to 3 low-risk application performance and user experience improvements are executed inside the files this run creates or changes. Changes to interfaces, schema, indexes, dependencies, configuration, security or user flows are listed as recommendations, not executed.

## Cost
2 delivery workers: 1 sonnet, 1 opus. Up to 3 improvement workers. Revision budget: 1 round per workstream.
Special actions: I (not the workers) run `npm ci` for checks, then commit, push to claude/project-thread-g9xgof and open a PR into main.
