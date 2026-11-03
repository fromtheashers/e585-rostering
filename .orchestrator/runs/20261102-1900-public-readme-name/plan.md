# Executive plan: 20261102-1900-public-readme-name

## Objective
Make the README fit for anyone who finds the repo (no private set-up details, no Render), and make the app's title read "<group name> Rostering" using the name the group types in, instead of the fixed "E585".

## Success criteria
1. README.md has no mention of Render/onrender, fromtheashers, cgroster, e585-neon, asher, E585, a real Hyperdrive ID, or migration-from-old-host steps.
2. README gives a fresh, step-by-step Cloudflare Workers + Neon deploy for someone who forks the repo, plus set-up, everyday use and local run.
3. Browser tab title, sign-in-free top bar, and installed-app name all read "<group name> Rostering" (e.g. "Grace Group Rostering"), and change when the group name is changed in Settings.
4. No user-visible "E585" left in src/.
5. `npm run typecheck`, `npm test` and `npm run build` pass.

## Scope
In: README.md; the app title in src/ (root layout metadata, public top bar fallback, setup form default, calendar file name/ID).
Out: render.yaml file, wrangler.jsonc (your Worker name and Hyperdrive ID stay so your deploy keeps working), PRODUCT.md and docs/ux-audit.md, internal cookie/variable names (renaming the cookie would sign everyone out).

## Assumptions
- "Changeable" means the title comes from the group name already set at Setup and editable in More > Settings, so no new setting is needed.
- Before a group exists (the Setup page), the title is plain "Rostering".
- The README heading becomes a generic "Small Group Rostering", with a line saying the app titles itself after your group.

## Workstreams
| ID | Workstream | Deliverable | Model | Reason for model | Depends on | Writable files |
|---|---|---|---|---|---|---|
| WS-1 | Public README | Rewritten README.md | sonnet | Well-specified doc rewrite from an outline | none | README.md |
| WS-2 | Group-named title | Title reads "<group> Rostering" | sonnet | Small, defined code change | none | src/app/layout.tsx, src/app/(public)/layout.tsx, src/app/setup/page.tsx, src/app/g/[token]/serving.ics/route.ts, src/app/g/[token]/me/page.tsx, src/app/globals.css (comment only), src/lib/data.ts (only if a cached lookup helper is needed) |

## Execution order
Wave 1: WS-1, WS-2 in parallel (files do not overlap).

## Acceptance criteria per workstream
WS-1
1. grep -i for render, onrender, fromtheashers, cgroster, e585, asher, 29ac8849 in README.md returns nothing.
2. Deploy section covers: fork, Neon direct string, Hyperdrive (caching off), put your Hyperdrive ID and Worker name in wrangler.jsonc, connect repo, build/deploy commands, DATABASE_URL build variable, SESSION_SECRET runtime secret, branch control, first visit to /setup.
3. Every step lists the exact clicks, matching the current README's level of detail.
4. Keeps: what it does, owner/admin/PIN help, limits and cost, run locally, Workers preview.

WS-2
1. Root metadata uses generateMetadata: default "<group name> Rostering", template "%s · <group name> Rostering"; "Rostering" when no group.
2. Public top bar fallback is "Rostering"; setup name field has no "E585" default (placeholder instead).
3. Calendar file is "serving.ics" and its PRODID/UID contain no "e585".
4. grep -rni e585 src/ shows only internal identifiers (cookie name, pool variable).
5. typecheck, tests and build pass.

## Risks and mitigations
- An extra database read on every page for the title: reuse the per-request cached group lookup, so it is one query shared with the page.
- Old calendar subscriptions: UID change only affects new downloads of the one-off .ics file; noted.

## Decisions taken
- Title from the existing group name. Rejected: an environment variable. Trade-off: no title separate from the group name.
- Leave wrangler.jsonc as is. Rejected: blanking your Worker name and ID. Trade-off: the repo still contains them; README tells forkers to replace them.

## Improvement pass
Status: ON (code changes). Up to 3 low-risk improvements inside the changed files only; anything else listed as a recommendation.

## Cost
2 delivery workers: 2 sonnet. Up to 3 improvement workers. Revision budget: 1 round per workstream.
