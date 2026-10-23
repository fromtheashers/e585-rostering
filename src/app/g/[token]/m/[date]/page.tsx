import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import {
  activePeople,
  activeRoles,
  assignmentsFor,
  availabilityFor,
  levelOf,
  meetingByDate,
  preferencesFor,
  recentServingCounts,
  songLibrary,
  songsFor,
  statusOf,
} from "@/lib/data";
import { memberContext } from "@/lib/guard";
import { assignRole, dropRole, setAvailability, takeRole } from "@/lib/actions";
import { coverText, panesFor, setsFor } from "@/lib/roster";
import { longDate, prettyTime, relativeFriday } from "@/lib/dates";
import { firstName } from "@/lib/palette";
import { Avatar, Hidden, Window } from "@/components/ui";
import { AutoSeg, ConfirmButton, CopyButton, SubmitButton } from "@/components/client";
import { SongSets } from "@/components/songs";
import { headers } from "next/headers";

const LEVEL_LABEL = { love: "Loves this", happy: "Happy to", rather_not: "Rather not" } as const;
const STATUS_LABEL = { yes: "Free", maybe: "Maybe", no: "Away" } as const;

export async function generateMetadata({ params }: { params: Promise<{ date: string }> }) {
  const { date } = await params;
  return { title: /^\d{4}-\d{2}-\d{2}$/.test(date) ? longDate(date) : "Meeting" };
}

export default async function MeetingPage({ params }: { params: Promise<{ token: string; date: string }> }) {
  const { token, date } = await params;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) notFound();
  const { group, me, organiser, today } = await memberContext(token, `/m/${date}`);
  const meeting = await meetingByDate(date);
  if (!meeting) notFound();
  const base = `/g/${token}`;

  const [roles, people, assignments, songs, avail, prefs, counts, library] = await Promise.all([
    activeRoles(),
    activePeople(),
    assignmentsFor([meeting.id]),
    songsFor([meeting.id]),
    availabilityFor([meeting.id]),
    preferencesFor(),
    recentServingCounts(date),
    songLibrary(date),
  ]);
  const panes = panesFor(meeting.id, roles, assignments, people);
  const sets = setsFor(meeting.id, roles.filter((r) => r.hasSongs), panes, people, songs);
  const mine = statusOf(avail, me, meeting.id);
  const host = (await headers()).get("host") ?? "";
  const proto = host.startsWith("localhost") ? "http" : "https";
  const link = `${proto}://${host}${base}/m/${date}`;
  const past = date < today;

  return (
    <main className="shell page">
      <Link href={base} className="backlink">
        <ArrowLeft size={18} aria-hidden /> Home
      </Link>
      <div>
        <h1 className="greeting">{longDate(date)}</h1>
        <p className="lede">
          {prettyTime(meeting.startTime ?? group.startTime)} · {past ? "this meeting has passed" : relativeFriday(today, date)}
        </p>
      </div>

      <div className="split">
        <div className="stack-lg">
          <Window
            label={`Roster for ${longDate(date)}`}
            panes={panes}
            meId={me.id}
            href={(roleId) => `#role-${roleId}`}
            openAction={(p) =>
              past ? null : (
                <form action={takeRole}>
                  <Hidden values={{ token, meetingId: meeting.id, roleId: p.roleId }} />
                  <SubmitButton className={`btn sm${p.required ? " primary" : ""}`} pending="Taking…">
                    {p.required ? "Take it" : "I'll do it"}
                  </SubmitButton>
                </form>
              )
            }
          />

          <section aria-labelledby="roles-h">
            <div className="section-head">
              <h2 id="roles-h">Roles</h2>
            </div>
            <ul className="row-list">
              {panes.map((p) => {
                const a = assignments.find((x) => x.roleId === p.roleId);
                const isMine = p.person?.id === me.id && !p.suggested;
                const open = !p.person || p.suggested;
                const candidates = open
                  ? people
                      .map((person) => ({
                        person,
                        status: statusOf(avail, person, meeting.id).status,
                        level: levelOf(prefs, person.id, p.roleId),
                        served: counts.get(person.id) ?? 0,
                        busy: panes.some((x) => x.person?.id === person.id && !x.suggested),
                      }))
                      .filter((c) => c.status !== "no" && c.level !== "rather_not" && !c.busy)
                      .sort(
                        (x, y) =>
                          (x.status === "yes" ? 0 : 1) - (y.status === "yes" ? 0 : 1) ||
                          (x.level === "love" ? 0 : 1) - (y.level === "love" ? 0 : 1) ||
                          x.served - y.served,
                      )
                  : [];
                return (
                  <li key={p.roleId} id={`role-${p.roleId}`} className="row" style={{ display: "block", scrollMarginTop: 80 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      {p.person && !p.suggested ? <Avatar person={p.person} /> : <span className="avatar" style={{ background: "transparent", border: "1px dashed var(--ink)" }} aria-hidden />}
                      <span className="row-main">
                        <strong>{p.roleName}</strong>
                        <span className="row-sub">
                          {p.person && !p.suggested
                            ? isMine
                              ? "You"
                              : p.person.name
                            : p.required
                              ? p.suggested
                                ? `Needs someone (auto-fill pencilled in ${firstName(p.person!.name)})`
                                : "Needs someone"
                              : "Optional · nobody yet"}
                        </span>
                      </span>
                      {!past && isMine && a ? (
                        <form action={dropRole}>
                          <Hidden values={{ token, assignmentId: a.id }} />
                          <ConfirmButton question="Free this slot?" confirm="Yes, I can't make it">
                            I can&rsquo;t make it
                          </ConfirmButton>
                        </form>
                      ) : null}
                      {!past && open ? (
                        <form action={takeRole}>
                          <Hidden values={{ token, meetingId: meeting.id, roleId: p.roleId }} />
                          <SubmitButton className={`btn sm${p.required ? " primary" : ""}`} pending="Taking…">
                            {p.required ? "Take it" : "I'll do it"}
                          </SubmitButton>
                        </form>
                      ) : null}
                    </div>

                    {organiser && !past ? (
                      p.person && !p.suggested ? (
                        <details className="disclose" style={{ marginTop: 4 }}>
                          <summary className="small muted">Change who&rsquo;s on {p.roleName}</summary>
                          <form action={assignRole} className="form-row" style={{ gridTemplateColumns: "minmax(0,1fr) auto" }}>
                        <Hidden values={{ token, meetingId: meeting.id, roleId: p.roleId }} />
                        <label className="visually-hidden" htmlFor={`assign-${p.roleId}`}>
                          Put someone on {p.roleName}
                        </label>
                        <select className="select" id={`assign-${p.roleId}`} name="personId" defaultValue={p.person && !p.suggested ? p.person.id : ""}>
                          <option value="">Nobody</option>
                          {people.map((person) => (
                            <option key={person.id} value={person.id}>
                              {person.name} · {STATUS_LABEL[statusOf(avail, person, meeting.id).status]}
                            </option>
                          ))}
                        </select>
                        <SubmitButton className="btn sm ghost" pending="Saving…">
                          Set
                        </SubmitButton>
                      </form>
                        </details>
                      ) : (
                        <form action={assignRole} className="form-row" style={{ marginTop: 10, gridTemplateColumns: "minmax(0,1fr) auto" }}>
                        <Hidden values={{ token, meetingId: meeting.id, roleId: p.roleId }} />
                        <label className="visually-hidden" htmlFor={`assign-${p.roleId}`}>
                          Put someone on {p.roleName}
                        </label>
                        <select className="select" id={`assign-${p.roleId}`} name="personId" defaultValue={p.person && !p.suggested ? p.person.id : ""}>
                          <option value="">Nobody</option>
                          {people.map((person) => (
                            <option key={person.id} value={person.id}>
                              {person.name} · {STATUS_LABEL[statusOf(avail, person, meeting.id).status]}
                            </option>
                          ))}
                        </select>
                        <SubmitButton className="btn sm ghost" pending="Saving…">
                          Set
                        </SubmitButton>
                      </form>
                      )
                    ) : null}

                    {open && p.required && !past ? (
                      <div className="panel" style={{ marginTop: 10 }}>
                        <p className="small" style={{ fontWeight: 600, marginBottom: 4 }}>
                          Who might take it
                        </p>
                        {candidates.length === 0 ? (
                          <p className="small muted">Nobody free has said they&rsquo;re up for this one yet.</p>
                        ) : (
                          <ul className="row-list">
                            {candidates.slice(0, 5).map((c) => (
                              <li key={c.person.id} className="row" style={{ minHeight: 48 }}>
                                <Avatar person={c.person} />
                                <span className="row-main">
                                  <strong>{c.person.id === me.id ? "You" : c.person.name}</strong>
                                  <span className="row-sub">
                                    {STATUS_LABEL[c.status]}
                                    {c.level ? ` · ${LEVEL_LABEL[c.level]}` : ""} · served {c.served}× in the last 8 weeks
                                  </span>
                                </span>
                              </li>
                            ))}
                          </ul>
                        )}
                        <div style={{ marginTop: 10 }}>
                          <CopyButton text={coverText({ roleName: p.roleName, date, link })} label='Copy a "can anyone cover?" message' />
                        </div>
                      </div>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          </section>
        </div>

        <aside className="stack-lg">
          {!past ? (
            <section className="panel stack" aria-labelledby="free-h">
              <h2 id="free-h" style={{ fontSize: "var(--fs-md)", fontWeight: 600 }}>
                Are you free this Friday?
              </h2>
              <AutoSeg
                action={setAvailability}
                name="status"
                value={mine.status}
                label="Your availability"
                hidden={{ token, meetingId: meeting.id }}
                wide
                options={[
                  { value: "yes", label: "Yes" },
                  { value: "maybe", label: "Maybe" },
                  { value: "no", label: "No" },
                ]}
              />
              {!mine.explicit ? <p className="small muted">Using your usual answer. Tap to set it for this Friday.</p> : null}
            </section>
          ) : null}

          {sets.length ? (
            <section id="songs" aria-labelledby="songs-h" style={{ scrollMarginTop: 80 }}>
              <div className="section-head">
                <h2 id="songs-h">Songs</h2>
              </div>
              <SongSets
                sets={sets}
                people={people}
                token={token}
                meId={me.id}
                organiser={organiser}
                meetingId={meeting.id}
                meetingHref={`${base}/m/${date}`}
                library={library}
                compact={past}
              />
            </section>
          ) : null}
        </aside>
      </div>
    </main>
  );
}
