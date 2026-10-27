import Link from "next/link";
import { redirect } from "next/navigation";
import { activePeople, activeRoles, assignmentsFor, currentPerson, firstGroup, songsFor, upcomingMeetings } from "@/lib/data";
import { panesFor, setsFor } from "@/lib/roster";
import { longDate, prettyTime, relativeFriday, shortDate, todayIn } from "@/lib/dates";
import { MiniPanes, StatusPill, Window } from "@/components/ui";
import { SongSets } from "@/components/songs";

export const dynamic = "force-dynamic";

/** The public, read-only roster. Anyone signed in goes straight to the private app. */
export default async function PublicHome() {
  const group = await firstGroup();
  if (!group) redirect("/setup");
  const me = await currentPerson(group);
  if (me) redirect(`/g/${group.linkToken}`);
  const today = todayIn(group.timezone);

  const [meetings, roles, people] = await Promise.all([upcomingMeetings(today, 8), activeRoles(), activePeople()]);
  const ids = meetings.map((m) => m.id);
  const [assignments, songs] = await Promise.all([assignmentsFor(ids), songsFor(ids)]);

  const next = meetings[0];
  const later = meetings.slice(1);

  if (!next) {
    return (
      <main className="shell page">
        <div>
          <h1 className="greeting">No Fridays are planned yet.</h1>
          <p className="lede">When the next meeting is added, its roster shows up here.</p>
        </div>
      </main>
    );
  }

  const panes = panesFor(next.id, roles, assignments, people);
  const href = `/m/${next.date}`;
  const songRoles = roles.filter((r) => r.hasSongs);
  const sets = setsFor(next.id, songRoles, panes, people, songs);

  return (
    <main className="shell page">
      <div>
        <h1 className="greeting">Who&rsquo;s serving {relativeFriday(today, next.date)}</h1>
        <p className="lede">
          {longDate(next.date)} · {prettyTime(next.startTime ?? group.startTime)}
        </p>
        <p className="small muted" style={{ marginTop: 8 }}>
          Have a PIN? <Link href="/sign-in">Sign in to sign up</Link>
        </p>
      </div>

      <div className="split">
        <div className="stack-lg">
          <section aria-labelledby="next-h">
            <div className="section-head">
              <h2 id="next-h">Who&rsquo;s serving</h2>
              <Link href={href}>Details</Link>
            </div>
            <Window label={`Roster for ${longDate(next.date)}`} panes={panes} meId={null} href={(roleId) => `${href}#role-${roleId}`} />
          </section>

          {songRoles.length ? (
            <section aria-labelledby="songs-h" className="panel">
              <div className="section-head">
                <h2 id="songs-h">Songs</h2>
                <Link href={`${href}#songs`}>All songs</Link>
              </div>
              <SongSets sets={sets} people={people} meId={null} organiser={false} meetingId={next.id} meetingHref={href} compact readOnly />
            </section>
          ) : null}
        </div>

        <aside className="stack-lg" aria-label="Coming up">
          <section aria-labelledby="later-h">
            <div className="section-head">
              <h2 id="later-h">Later Fridays</h2>
              <Link href="/calendar">Calendar</Link>
            </div>
            {later.length === 0 ? (
              <p className="muted small">No other meetings planned yet.</p>
            ) : (
              <ul className="row-list">
                {later.map((m) => {
                  const p = panesFor(m.id, roles, assignments, people);
                  return (
                    <li key={m.id}>
                      <Link href={`/m/${m.date}`} className="row">
                        <span className="row-main">
                          <strong>{shortDate(m.date)}</strong>
                          <span className="row-sub">{relativeFriday(today, m.date)}</span>
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
