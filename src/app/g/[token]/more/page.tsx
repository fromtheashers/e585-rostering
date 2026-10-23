import Link from "next/link";
import { headers } from "next/headers";
import { ChevronRight } from "lucide-react";
import { activePeople, activeRoles, assignmentsFor, recentActivity, songsFor, upcomingMeetings } from "@/lib/data";
import { memberOrOrganiserContext } from "@/lib/guard";
import { forgetPerson, lock } from "@/lib/actions";
import { rosterText } from "@/lib/roster";
import { Hidden } from "@/components/ui";
import { CopyButton } from "@/components/client";

export const metadata = { title: "More" };

function timeAgo(at: Date, now: Date) {
  const mins = Math.round((now.getTime() - at.getTime()) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} h ago`;
  const days = Math.round(hours / 24);
  return days === 1 ? "yesterday" : `${days} days ago`;
}

export default async function More({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const { group, organiser, today } = await memberOrOrganiserContext(token, "/more");
  const base = `/g/${token}`;

  const [meetings, roles, people, log] = await Promise.all([upcomingMeetings(today, 3), activeRoles(), activePeople(), recentActivity(30)]);
  const ids = meetings.map((m) => m.id);
  const [assignments, songs] = await Promise.all([assignmentsFor(ids), songsFor(ids)]);
  const host = (await headers()).get("host") ?? "";
  const link = `${host.startsWith("localhost") ? "http" : "https"}://${host}${base}`;
  const text = rosterText({ groupName: group.name, startTime: group.startTime, meetings, roles, assignments, people, songs, link });
  const now = new Date();

  return (
    <main className="shell page" style={{ maxWidth: 760 }}>
      <h1 className="greeting sub">More</h1>

      <section className="panel stack" aria-labelledby="share-h">
        <h2 id="share-h" style={{ fontSize: "var(--fs-md)", fontWeight: 600 }}>
          Share the roster in the group chat
        </h2>
        <p className="small muted">The next {meetings.length || ""} meetings as plain text, with the link at the end.</p>
        <pre className="copybox">{text}</pre>
        <div className="actions">
          <CopyButton text={text} label="Copy roster" className="btn sm primary" />
          <CopyButton text={link} label="Copy group link" />
        </div>
      </section>

      <section aria-labelledby="org-h">
        <div className="section-head">
          <h2 id="org-h">Organiser</h2>
          {organiser ? (
            <form action={lock}>
              <Hidden values={{ token }} />
              <button className="link-btn" type="submit">
                Lock on this device
              </button>
            </form>
          ) : null}
        </div>
        {organiser ? (
          <ul className="row-list panel flush">
            {[
              { href: "/organiser/roster", label: "Roster grid", sub: "See every Friday at once, auto-fill, confirm" },
              { href: "/calendar", label: "Meeting Fridays", sub: "Add or call off Fridays" },
              { href: "/organiser/people", label: "People", sub: "Add, rename or remove names" },
              { href: "/organiser/roles", label: "Roles", sub: "Names, optional roles, song sets" },
              { href: "/organiser/settings", label: "Settings", sub: "Group name, start time, PIN, new link" },
            ].map((item) => (
              <li key={item.href}>
                <Link href={base + item.href} className="row">
                  <span className="row-main">
                    <strong>{item.label}</strong>
                    <span className="row-sub">{item.sub}</span>
                  </span>
                  <ChevronRight size={18} aria-hidden />
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <div className="panel" style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", justifyContent: "space-between" }}>
            <p className="small muted">Organiser tools need the PIN.</p>
            <Link className="btn sm" href={`${base}/organiser/unlock`}>
              Unlock organiser tools
            </Link>
          </div>
        )}
      </section>

      <section aria-labelledby="log-h">
        <div className="section-head">
          <h2 id="log-h">Recent changes</h2>
          <span className="aside">So mix-ups are easy to spot</span>
        </div>
        {log.length === 0 ? (
          <p className="small muted">Nothing yet.</p>
        ) : (
          <ul className="log">
            {log.map((entry) => (
              <li key={entry.id}>
                <span>
                  <strong>{entry.actorLabel}</strong> {entry.message}
                </span>
                <time className="muted num" dateTime={entry.at.toISOString()}>
                  {timeAgo(entry.at, now)}
                </time>
              </li>
            ))}
          </ul>
        )}
      </section>

      <form action={forgetPerson}>
        <Hidden values={{ token }} />
        <button className="link-btn" type="submit">
          Not you? Switch person
        </button>
      </form>
    </main>
  );
}
