# Executive plan: 20261102-0900-meeting-start-time

## Objective
Let admins set a different start time for any single Friday (e.g. 7pm or 8pm instead of 7:30pm), and make the group's usual time easy to find, so every page, the shared roster text and the phone calendar feed show the real time.

## What exists today (checked in code)
- The group's usual time is already editable: More > Settings > "Usual start time" (src/app/g/[token]/organiser/settings/page.tsx). It defaults to 7:30pm from setup.
- Each meeting already has its own optional start time in the database (meetings.start_time, src/db/schema.ts:64), and every page, the roster text and serving.ics already prefer it over the usual time. But nothing in the app lets anyone set it. So today the only way to move one Friday is to change the time for every Friday.

## Success criteria
1. An admin on a meeting page (/g/<link>/m/<date>) can change that Friday's start time and save it; members and the public page cannot.
2. After saving, the new time shows on that meeting's page, the calendar list, home "next meeting", the public roster pages, the copied roster text and the serving.ics feed; other Fridays keep the usual time.
3. An admin can put a changed Friday back to the usual time in one tap.
4. A just-added meeting row on the calendar no longer flashes the wrong time (it uses the usual time, which is correct for a new meeting).
5. npm run typecheck, npm test and npm run build all pass.

## Scope
In: per-meeting time on the meeting page (admin only), a "back to usual time" action, an activity-log line, a "changed from usual" hint on the calendar row, a pointer from the meeting time field to Settings for changing every Friday.
Out (non-goals): end times, different weekdays, recurring patterns (e.g. "first Friday is 8pm"), database schema changes, changes to the existing Settings form.

## Assumptions
- "Cell group" means one meeting of this group, since the app holds one group. If you meant the whole group always meets at another time, that already works in Settings, and this plan adds a pointer to it.
- Only admins change times, same as adding or calling off a Friday.
- No migration: the column already exists.

## Workstreams
| ID | Workstream | Deliverable | Model | Reason for model | Depends on | Writable files |
|---|---|---|---|---|---|---|
| WS-1 | Per-Friday start time | setMeetingTime server action + admin time control on the meeting page + calendar hint | sonnet | Well specified build work in a known pattern (setMeeting, SaveForm) | none | src/lib/actions.ts, src/app/g/[token]/m/[date]/page.tsx, src/app/g/[token]/calendar/page.tsx, src/app/globals.css |

## Execution order
Wave 1: WS-1

## Acceptance criteria per workstream
WS-1
1. src/lib/actions.ts exports setMeetingTime(form) that calls organiserOnly, validates date (YYYY-MM-DD) and time (HH:MM or empty), updates meetings.start_time for that date (null when empty or equal to the group's usual time), writes an activity log line, and calls refresh(token).
2. The meeting page renders the time control only when organiser is true and the meeting is not past.
3. The control has a visible label, works by keyboard, shows saving feedback, and offers "Use usual time (7:30pm)" when the time differs.
4. The calendar row shows a small "changed" hint when meeting.startTime differs from the group's usual time.
5. No files outside the writable list change; typecheck, test and build pass.

## Risks and mitigations
- Time saved as an odd string breaks serving.ics: validate strictly to HH:MM.
- Public pages leak admin UI: control lives only in the signed-in meeting page and is gated on organiser.

## Decisions taken
- Put the control on the meeting page, not the calendar list. Rejected: inline time picker on every calendar row. Trade-off: one extra tap, but the calendar stays clean on phones.
- Store null when the time equals the usual time, so later changes to the usual time still flow through.

## Improvement pass
Status: ON (application code)
After delivery checks pass, up to 3 low-risk performance and UX improvements inside the changed files. Anything touching schema, config, dependencies, security or flows is listed as a recommendation only.

## Cost
1 delivery worker (sonnet). Up to 3 improvement workers. Revision budget: 1 round.
