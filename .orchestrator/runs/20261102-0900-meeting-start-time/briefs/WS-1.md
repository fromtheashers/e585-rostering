RUN: 20261102-0900-meeting-start-time
WORKSTREAM: WS-1: Per-Friday start time

OBJECTIVE
Some Fridays the group meets at a different time than the usual 7:30pm. Let admins set a start time for a single Friday from that meeting's page, and undo it in one tap.

TASK
1. Add an exported server action `setMeetingTime(form: FormData)` to src/lib/actions.ts, in the "Organiser: Fridays" section right after `setMeeting`.
2. Add an admin-only "Start time" control to the signed-in meeting page src/app/g/[token]/m/[date]/page.tsx.
3. On the signed-in calendar page src/app/g/[token]/calendar/page.tsx, show a small hint on a meeting row when its time differs from the usual time.

CONTEXT
- Next.js app router + Drizzle + Postgres. Stack is in package.json. Read the code before changing it.
- Schema (src/db/schema.ts): `groups.startTime` text NOT NULL "HH:MM" (the usual time, default "19:30"); `meetings.startTime` text NULLABLE (per-Friday override; null = use usual time). Do NOT change the schema or add migrations.
- Every display already does `meeting.startTime ?? group.startTime` (pages, src/lib/roster.ts, serving.ics), so storing the override is enough for all other surfaces.
- Existing helpers in src/lib/actions.ts: `organiserOnly(form)` returns `{ token, me, organiser, group, ... }` (check `load()` for what it returns; group must be available, if not load it the same way other actions such as updateSettings do); `log(me, organiser, message)`; `refresh(token)`; `str(form, key)`; `shortDate(date)` from ./dates; `isFriday`. Mirror `setMeeting` (around line 602).
- `prettyTime("19:30")` -> "7:30pm" in src/lib/dates.ts.
- Action rules: validate date with /^\d{4}-\d{2}-\d{2}$/; time must be "" or /^([01]\d|2[0-3]):[0-5]\d$/ else return without writing. If time is "" or equals group.startTime, store null. Update `meetings` where date matches (only an existing meeting row; do not insert). Log: `changed the time for ${shortDate(date)} to ${prettyTime(t)}` or `put ${shortDate(date)} back to the usual time`. Then refresh(token).
- UI on meeting page: render only when `organiser && !past`. Place it directly under the header lede (the <p className="lede"> showing the time). Use a native <input type="time"> with a visible <label> "Start time for this Friday", a Save submit button (use the existing `SubmitButton` from @/components/client with pending="Saving…", wrapped in a plain <form action={setMeetingTime}> with `<Hidden values={{ token, date }} />`, the same pattern as the assignRole form on that page). When meeting.startTime is set and differs from group.startTime, also render a second small form with a button "Use usual time (7:30pm)" (use prettyTime(group.startTime)) that submits time="". Add one line of muted small text: "To change every Friday, use More › Settings." with a Link to `${base}/organiser/settings`. Keep it compact: a <details className="disclose"> with summary "Change time" is acceptable and preferred so the header stays clean on phones.
- Calendar page: on the meeting row label `Meeting · {time}`, if meeting.startTime && meeting.startTime !== group.startTime, append to the row-sub text " · not the usual time" or similar short wording. Do not restructure the row.
- Style: reuse existing classes (btn sm, input, field, small muted, disclose, form-row). Only add CSS to src/app/globals.css if truly needed.
- Wording style: plain, friendly, short. No em-dashes.

INPUTS
src/lib/actions.ts, src/db/schema.ts, src/lib/dates.ts, src/app/g/[token]/m/[date]/page.tsx, src/app/g/[token]/calendar/page.tsx, src/components/client.tsx, src/components/ui.tsx, src/app/g/[token]/organiser/settings/page.tsx (for form patterns).

SCOPE
Writable: src/lib/actions.ts, src/app/g/[token]/m/[date]/page.tsx, src/app/g/[token]/calendar/page.tsx, src/app/globals.css
Read-only: everything else
Permitted special actions: run `npm run typecheck`, `npm test`, `npm run build` (dependencies are installed). No git commits, no installs, no migrations.

OUTPUT
Edited files in place. Report: files changed, summary of the change, verification results.

ACCEPTANCE CRITERIA
1. src/lib/actions.ts exports setMeetingTime(form) that calls organiserOnly, validates date and time, updates meetings.start_time for that date (null when empty or equal to the usual time), writes an activity log line, and calls refresh(token).
2. The meeting page renders the time control only when organiser is true and the meeting is not past.
3. The control has a visible label, is a native form (keyboard usable), shows saving feedback, and offers "Use usual time (<usual>)" when the time differs.
4. The calendar row shows a short hint when meeting.startTime differs from group.startTime.
5. No files outside the writable list change; typecheck, test and build pass.

VERIFICATION
npm run typecheck (no errors); npm test (all pass); npm run build (completes; if it fails only because DATABASE_URL or similar env is missing at build time, say so and include the error).

STOP CONDITIONS
Stop and report BLOCKED if: the change appears to need a schema change, a new dependency, or edits outside the writable files.
