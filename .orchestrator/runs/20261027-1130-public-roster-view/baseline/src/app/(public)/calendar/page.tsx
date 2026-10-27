import Link from "next/link";
import { redirect } from "next/navigation";
import { activePeople, activeRoles, assignmentsFor, firstGroup, meetingsBetween, songsFor } from "@/lib/data";
import { panesFor } from "@/lib/roster";
import { addMonths, fridaysInMonth, monthKey, monthName, prettyTime, todayIn } from "@/lib/dates";
import { MiniPanes, StatusPill } from "@/components/ui";

export const dynamic = "force-dynamic";
export const metadata = { title: "Calendar" };

const MONTHS_SHOWN = 3;

/** Which Fridays the group meets, read-only. */
export default async function PublicCalendar({ searchParams }: { searchParams: Promise<{ from?: string }> }) {
  const { from } = await searchParams;
  const group = await firstGroup();
  if (!group) redirect("/setup");
  const today = todayIn(group.timezone);

  const thisMonth = monthKey(today);
  const start = from && /^\d{4}-\d{2}$/.test(from) ? from : thisMonth;
  const months = Array.from({ length: MONTHS_SHOWN }, (_, i) => addMonths(start, i));
  const end = addMonths(start, MONTHS_SHOWN);

  const [meetings, roles, people] = await Promise.all([meetingsBetween(`${start}-01`, `${end}-01`), activeRoles(), activePeople()]);
  const ids = meetings.map((m) => m.id);
  const [assignments, songs] = await Promise.all([assignmentsFor(ids), songsFor(ids)]);

  return (
    <main className="shell page" style={{ maxWidth: 760 }}>
      <div>
        <h1 className="greeting sub">Which Fridays we meet</h1>
        <p className="lede">Fridays with a meeting are dark. Tap one to see who&rsquo;s serving.</p>
      </div>

      <div className="actions" style={{ justifyContent: "space-between" }}>
        <Link className="btn sm ghost" href={`/calendar?from=${addMonths(start, -MONTHS_SHOWN)}`} aria-label="Earlier months">
          Earlier
        </Link>
        {start !== thisMonth ? (
          <Link className="btn sm ghost" href="/calendar">
            This month
          </Link>
        ) : null}
        <Link className="btn sm ghost" href={`/calendar?from=${end}`} aria-label="Later months">
          Later
        </Link>
      </div>

      {months.map((month) => {
        const fridays = fridaysInMonth(month);
        const count = fridays.filter((d) => meetings.some((m) => m.date === d)).length;
        return (
          <section key={month} className="month panel flush" aria-labelledby={`m-${month}`}>
            <div className="section-head" style={{ paddingTop: 16, marginBottom: 0 }}>
              <h2 id={`m-${month}`}>{monthName(month)}</h2>
              <span className="aside">{count === 0 ? "No meetings" : `${count} ${count === 1 ? "meeting" : "meetings"}`}</span>
            </div>
            <div>
              {fridays.map((d) => {
                const meeting = meetings.find((m) => m.date === d);
                const past = d < today;
                const panes = meeting ? panesFor(meeting.id, roles, assignments, people) : [];
                const openSongs = meeting ? songs.filter((s) => s.meetingId === meeting.id && !s.leaderPersonId).length : 0;
                const day = d.slice(8).replace(/^0/, "");
                return (
                  <div key={d} className={`friday ${meeting ? "on" : "off"}${past ? " past" : ""}`}>
                    <span className="daybox num" aria-hidden>
                      <b>{day}</b>
                      <span>Fri</span>
                    </span>
                    {meeting ? (
                      <Link href={`/m/${d}`} className="row-main row-link">
                        <strong>
                          Meeting · {prettyTime(meeting.startTime ?? group.startTime)}
                          <span className="visually-hidden">, Friday {day}</span>
                        </strong>
                        <span className="row-sub">
                          {past ? "Done" : "Tap to see the roster"}
                          {openSongs ? ` · ${openSongs} open song ${openSongs === 1 ? "slot" : "slots"}` : ""}
                        </span>
                      </Link>
                    ) : (
                      <span className="row-main">
                        <strong>No meeting</strong>
                      </span>
                    )}
                    <span className="actions">
                      {meeting && !past ? (
                        <>
                          <MiniPanes panes={panes} />
                          <StatusPill panes={panes} />
                        </>
                      ) : null}
                    </span>
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}
    </main>
  );
}
