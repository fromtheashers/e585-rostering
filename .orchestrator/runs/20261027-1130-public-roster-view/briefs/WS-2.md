RUN: 20261027-1130-public-roster-view
WORKSTREAM: WS-2: Public PIN sign-in

OBJECTIVE
The site's plain address is becoming a public, read-only roster (built in parallel by another worker). From it, people who already have a PIN must be able to sign in and get their usual powers, without the public ever seeing the group's secret link token.

TASK
Add `/sign-in` (list of people who can sign in) and `/sign-in/[id]` (PIN entry), and a new server action `signInPublic` that shares the existing PIN check and lockout with `signIn`, then redirects to the full app at `/g/<token>`. Add a "Just looking? See the roster" link to `/` on the "Who are you?" page.

CONTEXT
- Next.js 15 App Router, React 19, TypeScript, Drizzle + Postgres on Cloudflare Workers. Single group: `firstGroup()` in src/lib/data.ts.
- Existing sign-in: src/lib/actions.ts `signIn` → `signInOnce` (around lines 170-230). It loads the group by `token` from the form, finds the active person by `personId`, and either makes a first PIN (claims the name) or verifies the PIN with lockout helpers `guessKey`, `guessState`, `wrongGuess`, `clearGuesses`, `TOO_MANY`, rehashes old hashes (`needsRehash`), then `signInAs(group, p.id, pinHash)` sets the cookie and redirects to `next` (only if it starts with `/g/${token}`) or `/g/${token}`. `signIn` wraps it with error logging (`unstable_rethrow` + console.error one-liner); give `signInPublic` the same wrapper.
- Existing PIN page to copy the look from: src/app/g/[token]/who/[id]/page.tsx (StateForm, SubmitButton, pinInput attributes, Avatar). Names list look: src/app/g/[token]/who/page.tsx.
- SECURITY RULES (locked):
  1. `signInPublic` resolves the group with `firstGroup()` (no token in the form). It must NEVER claim a name: a person with no `pinHash` gets an error like "You haven't made a PIN yet. Open the group link your organiser shared to make one." and nothing is written.
  2. Same lockout as `signIn`: locked → TOO_MANY; wrong PIN → `wrongGuess(ip)` and the existing wrong-PIN message; right PIN → clear guesses, rehash if needed, `signInAs`, `redirect(`/g/${group.linkToken}`)`. Factor the verify-existing-PIN branch into one shared helper used by both actions so `signIn` behaves exactly as before (same messages, same order of checks, same parallel lookups).
  3. The token must never reach the browser on /sign-in pages: no hidden token field, no token in links or props. The only place the token is used is the server-side redirect after a correct PIN.
  4. `/sign-in` lists only active people with a `pinHash`. If none, say "Nobody has made a PIN yet. Open the group link your organiser shared." `/sign-in/[id]` 404s (notFound) for an unknown/inactive person; for a person without a PIN show the "use the group link" message and no form. If no group exists, redirect to `/setup`.
  5. If the visitor is already signed in (`currentPerson(group)` in data.ts), `/sign-in` redirects to `/g/<token>`.
- Pages: `export const dynamic = "force-dynamic"`, metadata titles "Sign in" / "Your PIN". Back link from `/sign-in` to `/` ("Back to the roster") and from `/sign-in/[id]` to `/sign-in`. Copy in plain British English, no em dashes.
- The other worker owns src/app/(public)/**, src/app/page.tsx and the shared components; don't touch them. Its top bar links to `/sign-in`.
- Server actions for data changes call `member()`/`organiserOnly()`; do not change them.

INPUTS
src/lib/actions.ts, src/lib/data.ts, src/lib/secrets.ts, src/app/g/[token]/who/page.tsx, src/app/g/[token]/who/[id]/page.tsx, src/components/client.tsx (StateForm, SubmitButton), src/components/ui.tsx (Avatar, Hidden)

SCOPE
Writable: src/lib/actions.ts, src/app/sign-in/**, src/app/g/[token]/who/page.tsx
Read-only: everything else
Permitted special actions: run `npm run typecheck`, `npm test`, `npm run build` (dependencies installed). No commits, no installs.

OUTPUT
The files above. Report: files changed, a short description of the refactor of `signIn`, how each acceptance criterion is met (file:line), verification output.

ACCEPTANCE CRITERIA
1. `/sign-in` lists only active people with a PIN; with none, it says to use the group link.
2. `signInPublic` uses the first group, refuses people without a PIN (writes nothing), applies the same lockout and PIN rehash as `signIn`, then redirects to `/g/<token>`.
3. Shared PIN-check code is factored so `signIn` behaves exactly as before (same messages, checks and redirects).
4. "Who are you?" has a "Just looking? See the roster" link to `/`.
5. The token is never sent to the browser on /sign-in pages (no hidden token field, link or prop).
6. Already-signed-in visitors to `/sign-in` go to `/g/<token>`.
7. src/db/* unchanged; no other server action changed; `npm run typecheck`, `npm test`, `npm run build` pass.

VERIFICATION
Run `npm run typecheck`, `npm test`, `npm run build`; all must exit 0 (if the build fails only because of the other worker's in-progress files under src/app/(public) or src/app/page.tsx, say so and include the error). Run `grep -rn "linkToken\|token" src/app/sign-in` and explain each hit. Run `git diff src/lib/actions.ts` and include it in the report. Run `git diff --stat`.

STOP CONDITIONS
Stop and report BLOCKED if: the change needs edits to src/lib/data.ts, src/lib/secrets.ts or src/db/**; the refactor would change any existing message or redirect in `signIn`.
