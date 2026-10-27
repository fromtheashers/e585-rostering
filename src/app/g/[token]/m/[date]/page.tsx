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
import { Avatar, Hidden, Window, dropKey, takeKey, type PaneData } from "@/components/ui";
import { AutoSeg, AutoSelect, ConfirmButton, CopyButton, ShareButtons } from "@/components/client";
import { Pending, SaveForm } from "@/components/optimistic";
import type { Person } from "@/db/schema";
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
        <h1 className="greeting sub">{longDate(date)}</h1>
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
            meetingId={meeting.id}
            me={me}
            openAction={(p) => (past ? null : <TakeButton token={token} meetingId={meeting.id} pane={p} />)}
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
                const nobody = p.required ? "Needs someone" : "Optional · nobody yet";
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
                    <Pending on={takeKey(meeting.id, p.roleId)} show={<RoleHead roleName={p.roleName} person={me} sub="You" />}>
                    <Pending on={dropKey(meeting.id, p.roleId)} show={<RoleHead roleName={p.roleName} person={null} sub={nobody} />}>
                    <RoleHead
                      roleName={p.roleName}
                      person={open ? null : p.person}
                      sub={
                        !open
                          ? isMine
                            ? "You"
                            : p.person!.name
                          : p.suggested
                            ? `${nobody} (auto-fill pencilled in ${firstName(p.person!.name)})`
                            : nobody
                      }
                    >
                      {!past && isMine && a ? (
                        <SaveForm action={dropRole} keys={[dropKey(meeting.id, p.roleId)]}>
                          <Hidden values={{ token, assignmentId: a.id }} />
                          <ConfirmButton question="Free this slot?" confirm="Yes, I can't make it">
                            I can&rsquo;t make it
                          </ConfirmButton>
                        </SaveForm>
                      ) : null}
                      {!past && open ? <TakeButton token={token} meetingId={meeting.id} pane={p} /> : null}
                    </RoleHead>

                    {organiser && !past ? (
                      p.person && !p.suggested ? (
                        <details className="disclose" style={{ marginTop: 4 }}>
                          <summary className="small muted">Change who&rsquo;s on {p.roleName}</summary>
                          <AssignSelect token={token} meetingId={meeting.id} pane={p} people={people} avail={avail} />
                        </details>
                      ) : (
                        <div style={{ marginTop: 10 }}>
                          <AssignSelect token={token} meetingId={meeting.id} pane={p} people={people} avail={avail} />
                        </div>
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
                        <div className="actions" style={{ marginTop: 10 }}>
                          <CopyButton text={coverText({ roleName: p.roleName, date, link })} label='Copy a "can anyone cover?" message' />
                          <ShareButtons text={coverText({ roleName: p.roleName, date, link })} />
                        </div>
                      </div>
                    ) : null}
                    </Pending>
                    </Pending>
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

function TakeButton({ token, meetingId, pane }: { token: string; meetingId: number; pane: PaneData }) {
  return (
    <SaveForm action={takeRole} keys={[takeKey(meetingId, pane.roleId)]}>
      <Hidden values={{ token, meetingId, roleId: pane.roleId }} />
      <button type="submit" className={`btn sm${pane.required ? " primary" : ""}`}>
        {pane.required ? "Take it" : "I'll do it"}
      </button>
    </SaveForm>
  );
}

function RoleHead({
  roleName,
  person,
  sub,
  children,
}: {
  roleName: string;
  person: Pick<Person, "name" | "hue"> | null;
  sub: string;
  children?: React.ReactNode;
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
      {person ? <Avatar person={person} /> : <span className="avatar" style={{ background: "transparent", border: "1px dashed var(--ink)" }} aria-hidden />}
      <span className="row-main">
        <strong>{roleName}</strong>
        <span className="row-sub">{sub}</span>
      </span>
      {children}
    </div>
  );
}

/** The organiser's picker: choosing a name saves it, no extra button. */
function AssignSelect({
  token,
  meetingId,
  pane,
  people,
  avail,
}: {
  token: string;
  meetingId: number;
  pane: PaneData;
  people: Person[];
  avail: Parameters<typeof statusOf>[0];
}) {
  return (
    <AutoSelect
      action={assignRole}
      hidden={{ token, meetingId, roleId: pane.roleId }}
      name="personId"
      value={pane.person && !pane.suggested ? String(pane.person.id) : ""}
      className="select"
      label={`Put someone on ${pane.roleName}`}
      options={[
        { value: "", label: "Nobody" },
        ...people.map((person) => ({
          value: String(person.id),
          label: `${person.name} · ${STATUS_LABEL[statusOf(avail, person, meetingId).status]}`,
        })),
      ]}
    />
  );
}
