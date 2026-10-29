import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { activePeople, activeRoles, assignmentsFor, availabilityFor, offersFor, songsFor, upcomingMeetings } from "@/lib/data";
import { memberContext } from "@/lib/guard";
import { greetingFor, myRoles, panesFor, setsFor } from "@/lib/roster";
import { longDate, prettyTime, relativeFriday, shortDate } from "@/lib/dates";
import { MiniPanes, StatusPill, Window, openCount } from "@/components/ui";
import { OpenRoleAction } from "@/components/offer";
import { SongSets } from "@/components/songs";

export default async function Home({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const { group, me, organiser, today } = await memberContext(token, "");
  const base = `/g/${token}`;

  const [meetings, roles, people] = await Promise.all([upcomingMeetings(today, 8), activeRoles(), activePeople()]);
  const ids = meetings.map((m) => m.id);
  const [assignments, songs, avail, offers] = await Promise.all([assignmentsFor(ids), songsFor(ids), availabilityFor(ids), offersFor(ids)]);

  const next = meetings[0];
  const later = meetings.slice(1);
  const unmarked = meetings.filter((m) => !avail.some((a) => a.personId === me.id && a.meetingId === m.id)).length;

  if (!next) {
    return (
      <main className="shell page">
        <div>
          <h1 className="greeting">{me.name.split(" ")[0]}, no Fridays are planned yet.</h1>
          <p className="lede">When the organiser adds the next meeting, its roster shows up here.</p>
        </div>
        {organiser ? (
          <div>
            <Link href={`${base}/calendar`} className="btn primary">
              Add meeting Fridays
            </Link>
          </div>
        ) : null}
      </main>
    );
  }

  const panes = panesFor(next.id, roles, assignments, people);
  const mine = myRoles(panes, me.id);
  const when = relativeFriday(today, next.date);
  const href = `${base}/m/${next.date}`;
  const songRoles = roles.filter((r) => r.hasSongs);
  const sets = setsFor(next.id, songRoles, panes, people, songs);

  return (
    <main className="shell page">
      <div>
        <h1 className="greeting">{greetingFor({ me, mine, open: openCount(panes), when })}</h1>
        <p className="lede">
          {longDate(next.date)} · {prettyTime(next.startTime ?? group.startTime)}
        </p>
      </div>

      <div className="split">
        <div className="stack-lg">
          <section aria-labelledby="next-h">
            <div className="section-head">
              <h2 id="next-h">Who&rsquo;s serving</h2>
              <Link href={href}>Details</Link>
            </div>
            <Window
              label={`Roster for ${longDate(next.date)}`}
              panes={panes}
              meId={me.id}
              href={(roleId) => `${href}#role-${roleId}`}
              meetingId={next.id}
              me={me}
              openAction={(p) => (
                <OpenRoleAction
                  token={token}
                  meetingId={next.id}
                  pane={p}
                  organiser={organiser}
                  offered={offers.some((o) => o.personId === me.id && o.meetingId === next.id && o.roleId === p.roleId)}
                />
              )}
            />
          </section>

          {songRoles.length ? (
            <section aria-labelledby="songs-h" className="panel">
              <div className="section-head">
                <h2 id="songs-h">Songs</h2>
                <Link href={`${href}#songs`}>All songs</Link>
              </div>
              <SongSets
                sets={sets}
                people={people}
                token={token}
                meId={me.id}
                organiser={organiser}
                meetingId={next.id}
                meetingHref={href}
                compact
              />
            </section>
          ) : null}
        </div>

        <aside className="stack-lg" aria-label="Coming up">
          {unmarked > 0 ? (
            <Link href={`${base}/me`} className="panel row-link" style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <span className="row-main">
                <strong>Mark which Fridays you&rsquo;re free</strong>
                <span className="row-sub">
                  {unmarked} of the next {meetings.length} {meetings.length === 1 ? "meeting isn't" : "meetings aren't"} marked yet
                </span>
              </span>
              <ChevronRight size={18} aria-hidden />
            </Link>
          ) : null}

          <section aria-labelledby="later-h">
            <div className="section-head">
              <h2 id="later-h">Later Fridays</h2>
              <Link href={`${base}/calendar`}>Calendar</Link>
            </div>
            {later.length === 0 ? (
              <p className="muted small">No other meetings planned yet.</p>
            ) : (
              <ul className="row-list">
                {later.map((m) => {
                  const p = panesFor(m.id, roles, assignments, people);
                  const mineThere = myRoles(p, me.id);
                  return (
                    <li key={m.id}>
                      <Link href={`${base}/m/${m.date}`} className="row">
                        <span className="row-main">
                          <strong>{shortDate(m.date)}</strong>
                          <span className="row-sub">{mineThere.length ? `You: ${mineThere.join(", ")}` : relativeFriday(today, m.date)}</span>
                        </span>
                        <MiniPanes panes={p} />
                        <StatusPill panes={p} />
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </aside>
      </div>
    </main>
  );
}
