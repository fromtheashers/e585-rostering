RUN: 20261102-1900-public-readme-name
WORKSTREAM: WS-2: Group-named title

OBJECTIVE
The app should title itself "<group name> Rostering" using the group name set at Setup (editable in More > Settings), instead of the hard-coded "E585 Rostering", so any group can use it.

TASK
1. src/app/layout.tsx: replace static `metadata` with `generateMetadata()` that loads the group with a per-request cached lookup and returns title { default: `${name} Rostering`, template: `%s · ${name} Rostering` }, falling back to "Rostering" (default) and "%s · Rostering" (template) when no group exists or the lookup throws (e.g. no DATABASE_URL at build time). Keep description, robots, referrer. Use the existing cached `publicGroup` from src/app/(public)/group.ts (it is `cache(firstGroup)`, server-only) or move/duplicate a cached helper into src/lib/data.ts. Make sure the root layout does not break static/prerendered routes like not-found during `npm run build` (wrap in try/catch).
2. src/app/(public)/layout.tsx: top bar brand shows `${group.name} Rostering`? NO: keep showing `group.name` when a group exists (the bar is narrow); only change the fallback "E585 Rostering" to "Rostering".
3. src/app/g/[token]/layout.tsx: appleWebApp title stays group.name (Home Screen labels are short); the manifest already uses `${group.name} Rostering`. Do not change unless needed.
4. src/app/setup/page.tsx: remove defaultValue="E585" from the Group name input; add placeholder "For example, Grace Group".
5. src/app/g/[token]/serving.ics/route.ts and src/app/g/[token]/me/page.tsx: file name "serving.ics"; PRODID "-//Rostering//Serving dates//EN"; UID like `serving-${group.id}-${m.id}-${me.id}@rostering`.
6. src/app/globals.css: header comment "E585 Rostering." → "Rostering." (comment only).

CONTEXT
Next.js 15 App Router, TypeScript. firstGroup() in src/lib/data.ts returns Group | null with a `name` field. Do NOT rename the cookie `e585_person` in src/lib/data.ts or `__e585Pool` in src/db/index.ts (renaming the cookie signs everyone out).

INPUTS
The files above, src/lib/data.ts, src/app/(public)/group.ts, src/app/g/[token]/manifest.webmanifest/route.ts.

SCOPE
Writable: src/app/layout.tsx, src/app/(public)/layout.tsx, src/app/setup/page.tsx, src/app/g/[token]/serving.ics/route.ts, src/app/g/[token]/me/page.tsx, src/app/globals.css (comment only), src/lib/data.ts (only to add a cached helper), src/app/g/[token]/layout.tsx (only if needed)
Read-only: everything else
Permitted special actions: `npm ci` (install from the existing lockfile, no new packages), `npm run typecheck`, `npm test`, `npm run build` (plain next build; no DATABASE_URL needed, must succeed without one)

OUTPUT
Edited files in place.

ACCEPTANCE CRITERIA
1. Root metadata uses generateMetadata with "<group name> Rostering" and template, "Rostering" fallback.
2. Public top bar fallback "Rostering"; setup name input has no E585 default and has the placeholder.
3. Calendar file is serving.ics; PRODID/UID contain no "e585".
4. `grep -rni e585 src/` shows only the cookie name and pool variable.
5. typecheck, tests and build pass.

VERIFICATION
Run npm ci, npm run typecheck, npm test, npm run build, and the grep. Report pass/fail of each with the tail of the output.

STOP CONDITIONS
Stop and report BLOCKED if the build cannot pass without DATABASE_URL because of your change, or if a change outside the writable files seems necessary.
