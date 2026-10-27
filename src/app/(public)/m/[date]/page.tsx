import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { activePeople, activeRoles, assignmentsFor, meetingByDate, songsFor } from "@/lib/data";
import { publicGroup } from "../../group";
import { panesFor, setsFor } from "@/lib/roster";
import { longDate, prettyTime, relativeFriday, todayIn } from "@/lib/dates";
import { Avatar, Window } from "@/components/ui";
import { SongSets } from "@/components/songs";
import type { Person } from "@/db/schema";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ date: string }> }) {
  const { date } = await params;
  return { title: /^\d{4}-\d{2}-\d{2}$/.test(date) ? longDate(date) : "Meeting" };
}

/** One Friday's roster and songs, read-only. */
export default async function PublicMeeting({ params }: { params: Promise<{ date: string }> }) {
  const { date } = await params;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) notFound();
  const group = await publicGroup();
  if (!group) redirect("/setup");
  const meeting = await meetingByDate(date);
  if (!meeting) notFound();
  const today = todayIn(group.timezone);

  const [roles, people, assignments, songs] = await Promise.all([activeRoles(), activePeople(), assignmentsFor([meeting.id]), songsFor([meeting.id])]);
  const panes = panesFor(meeting.id, roles, assignments, people);
  const sets = setsFor(meeting.id, roles.filter((r) => r.hasSongs), panes, people, songs);
  const past = date < today;

  return (
    <main className="shell page">
      <Link href="/" className="backlink">
        <ArrowLeft size={18} aria-hidden /> Home
      </Link>
      <div>
        <h1 className="greeting sub">{longDate(date)}</h1>
        <p className="lede">
          {prettyTime(meeting.startTime ?? group.startTime)} · {past ? "this meeting has passed" : relativeFriday(today, date)}
        </p>
        <p className="small muted" style={{ marginTop: 8 }}>
          Have a PIN? <Link href="/sign-in">Sign in to sign up</Link>
        </p>
      </div>

      <div className="split">
        <div className="stack-lg">
          <Window label={`Roster for ${longDate(date)}`} panes={panes} meId={null} href={(roleId) => `#role-${roleId}`} />

          <section aria-labelledby="roles-h">
            <div className="section-head">
              <h2 id="roles-h">Roles</h2>
            </div>
            <ul className="row-list">
              {panes.map((p) => {
                const open = !p.person || p.suggested;
                const nobody = p.required ? "Needs someone" : "Optional · nobody yet";
                return (
                  <li key={p.roleId} id={`role-${p.roleId}`} className="row" style={{ display: "block", scrollMarginTop: 80 }}>
                    <RoleHead roleName={p.roleName} person={open ? null : p.person} sub={open ? nobody : p.person!.name} />
                  </li>
                );
              })}
            </ul>
          </section>
        </div>

        {sets.length ? (
          <aside className="stack-lg">
            <section id="songs" aria-labelledby="songs-h" style={{ scrollMarginTop: 80 }}>
              <div className="section-head">
                <h2 id="songs-h">Songs</h2>
              </div>
              <SongSets sets={sets} people={people} meId={null} organiser={false} meetingId={meeting.id} meetingHref={`/m/${date}`} compact readOnly />
            </section>
          </aside>
        ) : null}
      </div>
    </main>
  );
}

function RoleHead({ roleName, person, sub }: { roleName: string; person: Pick<Person, "name" | "hue"> | null; sub: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
      {person ? <Avatar person={person} /> : <span className="avatar" style={{ background: "transparent", border: "1px dashed var(--ink)" }} aria-hidden />}
      <span className="row-main">
        <strong>{roleName}</strong>
        <span className="row-sub">{sub}</span>
      </span>
    </div>
  );
}
