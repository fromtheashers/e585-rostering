import Link from "next/link";
import { headers } from "next/headers";
import { ArrowLeft } from "lucide-react";
import {
  activePeople,
  activeRoles,
  assignmentsFor,
  availabilityFor,
  recentServingCounts,
  songsFor,
  statusOf,
  upcomingMeetings,
} from "@/lib/data";
import { organiserContext } from "@/lib/guard";
import { assignRole, clearSuggestions, confirmSuggestions, suggestRoster } from "@/lib/actions";
import { rosterText } from "@/lib/roster";
import { shortDate } from "@/lib/dates";
import { firstName } from "@/lib/palette";
import { Avatar, Hidden } from "@/components/ui";
import { AutoSelect, CopyButton, SubmitButton } from "@/components/client";

export const metadata = { title: "Roster grid" };

const MARK = { yes: "", maybe: " (maybe)", no: " (away)" } as const;

export default async function RosterGrid({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const { group, today } = await organiserContext(token, "/organiser/roster");
  const base = `/g/${token}`;

  const [meetings, roles, people] = await Promise.all([upcomingMeetings(today, 8), activeRoles(), activePeople()]);
  const ids = meetings.map((m) => m.id);
  const [assignments, avail, songs, counts] = await Promise.all([
    assignmentsFor(ids),
    availabilityFor(ids),
    songsFor(ids),
    recentServingCounts(meetings[0]?.date ?? today),
  ]);
  const suggested = assignments.filter((a) => a.status === "suggested").length;
  const open = meetings.reduce(
    (n, m) => n + roles.filter((r) => r.required && !assignments.some((a) => a.meetingId === m.id && a.roleId === r.id && a.status === "confirmed")).length,
    0,
  );
  const host = (await headers()).get("host") ?? "";
  const link = `${host.startsWith("localhost") ? "http" : "https"}://${host}${base}`;
  const confirmed = assignments.filter((a) => a.status === "confirmed");
  const text = rosterText({ groupName: group.name, startTime: group.startTime, meetings: meetings.slice(0, 4), roles, assignments: confirmed, people, songs, link });

  // Times served: last eight weeks plus what is already on the upcoming roster.
  const load = new Map(counts);
  for (const a of confirmed) load.set(a.personId, (load.get(a.personId) ?? 0) + 1);

  return (
    <main className="shell page">
      <Link href={`${base}/more`} className="backlink">
        <ArrowLeft size={18} aria-hidden /> More
      </Link>
      <div>
        <h1 className="greeting">Roster grid</h1>
        <p className="lede">
          {meetings.length === 0
            ? "No meetings planned yet."
            : open === 0
              ? `Every required role is filled for the next ${meetings.length} ${meetings.length === 1 ? "meeting" : "meetings"}.`
              : `${open} required ${open === 1 ? "slot is" : "slots are"} still open across the next ${meetings.length} ${meetings.length === 1 ? "meeting" : "meetings"}.`}
        </p>
      </div>

      {meetings.length === 0 ? (
        <div className="empty">
          <strong>Add the Fridays you meet first.</strong>
          <Link className="btn primary" href={`${base}/calendar`}>
            Open the calendar
          </Link>
        </div>
      ) : (
        <>
          <div className="actions">
            <form action={suggestRoster}>
              <Hidden values={{ token }} />
              <SubmitButton className="btn" pending="Thinking…">
                Suggest people for open slots
              </SubmitButton>
            </form>
            {suggested ? (
              <>
                <form action={confirmSuggestions}>
                  <Hidden values={{ token }} />
                  <SubmitButton className="btn primary" pending="Confirming…">
                    Confirm {suggested} {suggested === 1 ? "suggestion" : "suggestions"}
                  </SubmitButton>
                </form>
                <form action={clearSuggestions}>
                  <Hidden values={{ token }} />
                  <SubmitButton className="btn ghost">Clear suggestions</SubmitButton>
                </form>
              </>
            ) : null}
          </div>
          {suggested ? (
            <p className="small muted" style={{ marginTop: -16 }}>
              Suggestions are in italics. Members still see those slots as open until you confirm.
            </p>
          ) : null}

          <div className="grid-wrap">
            <table className="roster">
              <thead>
                <tr>
                  <th scope="col">Role</th>
                  {meetings.map((m) => (
                    <th key={m.id} scope="col">
                      <Link href={`${base}/m/${m.date}`}>{shortDate(m.date)}</Link>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {roles.map((r) => (
                  <tr key={r.id}>
                    <th scope="row">
                      {r.name}
                      {r.required ? null : <span className="muted xs"> optional</span>}
                    </th>
                    {meetings.map((m) => {
                      const a = assignments.find((x) => x.meetingId === m.id && x.roleId === r.id);
                      const cls = ["cell-select", !a ? (r.required ? "is-open" : "is-optional") : "", a?.status === "suggested" ? "is-suggested" : ""].join(" ");
                      return (
                        <td key={m.id}>
                          <AutoSelect
                            action={assignRole}
                            hidden={{ token, meetingId: m.id, roleId: r.id }}
                            name="personId"
                            value={a ? String(a.personId) : ""}
                            className={cls}
                            label={`${r.name} on ${shortDate(m.date)}`}
                            options={[
                              { value: "", label: r.required ? "Open" : "Nobody" },
                              ...people.map((p) => ({
                                value: String(p.id),
                                label: firstName(p.name) + MARK[statusOf(avail, p, m.id).status],
                              })),
                            ]}
                          />
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="split">
            <section aria-labelledby="load-h">
              <div className="section-head">
                <h2 id="load-h">How often people are serving</h2>
                <span className="aside">Last 8 weeks plus what&rsquo;s booked</span>
              </div>
              <ul className="row-list">
                {[...people]
                  .sort((a, b) => (load.get(b.id) ?? 0) - (load.get(a.id) ?? 0) || a.name.localeCompare(b.name))
                  .map((p) => (
                    <li key={p.id} className="row" style={{ minHeight: 48 }}>
                      <Avatar person={p} />
                      <span className="row-main">
                        <strong>{p.name}</strong>
                      </span>
                      <span className="num">{load.get(p.id) ?? 0}</span>
                    </li>
                  ))}
              </ul>
            </section>
            <section className="panel stack" aria-labelledby="share-h">
              <h2 id="share-h" style={{ fontSize: "var(--fs-md)", fontWeight: 600 }}>
                Share in the group chat
              </h2>
              <pre className="copybox">{text}</pre>
              <div>
                <CopyButton text={text} label="Copy roster" className="btn sm primary" />
              </div>
            </section>
          </div>
        </>
      )}
    </main>
  );
}
