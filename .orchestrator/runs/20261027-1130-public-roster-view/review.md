# Review (wave 1)
Verified by orchestrator: typecheck exit 0; tests 13/13; build exit 0; throwaway Postgres 16 + next start + Playwright at 390px.
WS-1
1 PASS public /, /m/2026-10-30, /calendar: 0 forms, 0 buttons (Playwright)
2 PASS SECRETTOKEN absent from HTML of all public pages; only linkToken use is signed-in redirect (page.tsx:16)
3 PASS open panes "Needs someone"/"Nobody yet"; one Sign in in top bar; one PIN prompt (screenshots)
4 PASS signed-in visit to / -> /g/SECRETTOKEN123abc
5 PASS no Maybe/Away/Who might text on public pages
6 PASS src/app/g diff only who/page.tsx (WS-2); member meeting page still shows Take it / I can't make it / song controls
7 PASS actions.ts only WS-2 changes; src/db untouched
WS-2
1 PASS /sign-in lists only PIN holders (code page.tsx:15; Caleb absent in render)
2 PASS signInPublic firstGroup, no-PIN refuses before writes, checkExistingPin lockout/rehash; right PIN -> /g/<token> (Playwright)
3 PASS signIn else-branch moved verbatim to checkExistingPin; messages identical
4 PASS who page link to /
5 PASS no token in /sign-in, /sign-in/3 HTML; hidden field personId only
6 PASS code page.tsx:14
7 PASS checks pass; src/db unchanged
Both ACCEPTED, 0 revisions.
