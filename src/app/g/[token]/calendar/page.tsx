import Link from "next/link";
import { activePeople, activeRoles, assignmentsFor, meetingsBetween, songsFor } from "@/lib/data";
import { memberOrOrganiserContext } from "@/lib/guard";
import { setMeeting } from "@/lib/actions";
import { myRoles, panesFor } from "@/lib/roster";
import { addMonths, fridaysInMonth, monthKey, monthName, prettyTime } from "@/lib/dates";
import { Hidden, MiniPanes, StatusPill } from "@/components/ui";
import { ConfirmButton, SubmitButton } from "@/components/client";

export const metadata = { title: "Calendar" };

const MONTHS_SHOWN = 3;

export default async function CalendarPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ from?: string }>;
}) {
  const { token } = await params;
  const { from } = await searchParams;
  const { group, me, organiser, today } = await memberOrOrganiserContext(token, "/calendar");
  const base = `/g/${token}`;

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
        <h1 className="greeting">Which Fridays we meet</h1>
        <p className="lede">
          {organiser
            ? "Tap Add or Call off to change a Friday. Everyone sees this calendar."
            : "Fridays with a meeting are dark. Tap one to see who's serving and take an open slot."}
        </p>
      </div>

      <div className="actions" style={{ justifyContent: "space-between" }}>
        <Link className="btn sm ghost" href={`${base}/calendar?from=${addMonths(start, -MONTHS_SHOWN)}`} aria-label="Earlier months">
          Earlier
        </Link>
        {start !== thisMonth ? (
          <Link className="btn sm ghost" href={`${base}/calendar`}>
            This month
          </Link>
        ) : null}
        <Link className="btn sm ghost" href={`${base}/calendar?from=${end}`} aria-label="Later months">
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
              <span className="aside">
                {count === 0 ? "No meetings" : `${count} ${count === 1 ? "meeting" : "meetings"}`}
              </span>
            </div>
            <div>
              {fridays.map((d) => {
                const meeting = meetings.find((m) => m.date === d);
                const past = d < today;
                const panes = meeting ? panesFor(meeting.id, roles, assignments, people) : [];
                const mine = myRoles(panes, me?.id ?? null);
                const openSongs = meeting ? songs.filter((s) => s.meetingId === meeting.id && !s.leaderPersonId).length : 0;
                const filled = assignments.filter((a) => a.meetingId === meeting?.id).length + songs.filter((s) => s.meetingId === meeting?.id).length;
                const day = d.slice(8).replace(/^0/, "");
                return (
                  <div key={d} className={`friday ${meeting ? "on" : "off"}${past ? " past" : ""}`}>
                    <span className="daybox num" aria-hidden>
                      <b>{day}</b>
                      <span>Fri</span>
                    </span>
                    {meeting ? (
                      <Link href={`${base}/m/${d}`} className="row-main row-link">
                        <strong>
                          Meeting · {prettyTime(meeting.startTime ?? group.startTime)}
                          <span className="visually-hidden">, Friday {day}</span>
                        </strong>
                        <span className="row-sub">
                          {mine.length ? `You: ${mine.join(", ")}` : past ? "Done" : "Tap to see the roster"}
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
                      {organiser && !past ? (
                        <form action={setMeeting}>
                          <Hidden values={{ token, date: d, on: meeting ? "0" : "1" }} />
                          {meeting ? (
                            filled > 0 ? (
                              <ConfirmButton question="Call off? Roles and songs will be cleared." confirm="Call off">
                                Call off
                              </ConfirmButton>
                            ) : (
                              <SubmitButton className="btn sm ghost">Call off</SubmitButton>
                            )
                          ) : (
                            <SubmitButton className="btn sm" pending="Adding…">
                              Add
                            </SubmitButton>
                          )}
                        </form>
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
