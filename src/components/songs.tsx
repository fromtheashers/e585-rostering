import Link from "next/link";
import { ArrowDown, ArrowUp, Plus } from "lucide-react";
import type { Person, Role, Song } from "@/db/schema";
import { addOpenSlot, addSong, claimSong, moveSong, releaseSong, removeSong, updateSong } from "@/lib/actions";
import { firstName } from "@/lib/palette";
import { Avatar, Hidden } from "./ui";
import { StateForm, SubmitButton } from "./client";
import { AddSongForm, DraftRows, Pending, SaveForm, SongDrafts, UnlessDrafts } from "./optimistic";

export const KEY_OPTIONS = ["C", "C#", "Db", "D", "Eb", "E", "F", "F#", "G", "Ab", "A", "Bb", "B", "Cm", "C#m", "Dm", "Ebm", "Em", "Fm", "F#m", "Gm", "G#m", "Am", "Bbm", "Bm"];

interface SetData {
  role: Role;
  leader: Person | null;
  songs: Song[];
}

/** The open-slot look, used for real open slots and for ones that are still saving. */
function OpenSlot({ children, readOnly }: { children?: React.ReactNode; readOnly?: boolean }) {
  return (
    <div className="slot-open">
      <div className="row-main">
        <strong>Open song slot</strong>
        <span className="row-sub">{readOnly ? "Sign in to lead this one." : "Anyone can lead this one."}</span>
      </div>
      {children ? <div className="actions">{children}</div> : null}
    </div>
  );
}

function SongLine({ song, leaderName, mine }: { song: Pick<Song, "title" | "artist" | "songKey">; leaderName: string; mine: boolean }) {
  const title = song.title || (mine ? "Add your song" : "Song to be picked");
  return (
    <div className="row-main">
      <span className="song-title" style={song.title ? undefined : { color: "var(--muted)", fontWeight: 500 }}>
        {title}
      </span>
      <span className="song-meta">{[song.artist, `led by ${mine ? "you" : firstName(leaderName)}`].filter(Boolean).join(" · ")}</span>
    </div>
  );
}

function KeyBadge({ songKey }: { songKey: string }) {
  return songKey ? (
    <span className="key" aria-label={`Key of ${songKey}`}>
      {songKey}
    </span>
  ) : (
    <span className="key muted" aria-label="No key yet">
      –
    </span>
  );
}

function SongRow(props: Parameters<typeof SongRowBody>[0]) {
  // A removed song disappears at once.
  return (
    <Pending on={`remove:${props.song.id}`} show={null}>
      <SongRowBody {...props} />
    </Pending>
  );
}

function SongRowBody({
  song,
  people,
  token,
  meId,
  canEdit,
  first,
  last,
  compact,
  readOnly,
}: {
  song: Song;
  people: Person[];
  token: string;
  meId: number | null;
  canEdit: boolean;
  first: boolean;
  last: boolean;
  compact?: boolean;
  readOnly?: boolean;
}) {
  const leader = people.find((p) => p.id === song.leaderPersonId) ?? null;
  const mine = song.leaderPersonId === meId;

  if (!leader && readOnly) return <OpenSlot readOnly />;

  if (!leader) {
    const claimed = (
      <div className="song">
        <SongLine song={song} leaderName="" mine />
        <KeyBadge songKey={song.songKey} />
      </div>
    );
    return (
      <Pending on={`claim:${song.id}`} show={claimed}>
        <OpenSlot>
          <SaveForm action={claimSong} keys={[`claim:${song.id}`]}>
            <Hidden values={{ token, songId: song.id }} />
            <button type="submit" className="btn sm primary">
              I&rsquo;ll lead it
            </button>
          </SaveForm>
          {canEdit && !compact ? (
            <SaveForm action={removeSong} keys={[`remove:${song.id}`]}>
              <Hidden values={{ token, songId: song.id }} />
              <button type="submit" className="btn sm ghost">
                Remove
              </button>
            </SaveForm>
          ) : null}
        </OpenSlot>
      </Pending>
    );
  }

  return (
    <Pending on={`release:${song.id}`} show={<OpenSlot />}>
    <div className="song">
      <SongLine song={song} leaderName={leader.name} mine={mine} />
      <KeyBadge songKey={song.songKey} />
      {!compact && !readOnly && (mine || canEdit) ? (
        <details className="disclose" style={{ gridColumn: "1 / -1" }}>
          <summary className="small muted">Edit</summary>
          <div className="stack" style={{ paddingBottom: 8 }}>
            <SongFields action={updateSong} hidden={{ token, songId: song.id }} song={song} submit="Save song" people={people} />
            <div className="actions">
              {!first ? (
                <form action={moveSong}>
                  <Hidden values={{ token, songId: song.id, dir: "up" }} />
                  <button className="btn sm ghost" type="submit">
                    <ArrowUp size={16} aria-hidden /> Earlier
                  </button>
                </form>
              ) : null}
              {!last ? (
                <form action={moveSong}>
                  <Hidden values={{ token, songId: song.id, dir: "down" }} />
                  <button className="btn sm ghost" type="submit">
                    <ArrowDown size={16} aria-hidden /> Later
                  </button>
                </form>
              ) : null}
              {mine && !canEdit ? (
                <SaveForm action={releaseSong} keys={[`release:${song.id}`]}>
                  <Hidden values={{ token, songId: song.id }} />
                  <button type="submit" className="btn sm ghost">
                    I can&rsquo;t lead this
                  </button>
                </SaveForm>
              ) : (
                <SaveForm action={removeSong} keys={[`remove:${song.id}`]}>
                  <Hidden values={{ token, songId: song.id }} />
                  <button type="submit" className="btn sm danger">
                    Remove song
                  </button>
                </SaveForm>
              )}
            </div>
          </div>
        </details>
      ) : null}
    </div>
    </Pending>
  );
}

function SongFields({
  action,
  hidden,
  song,
  submit,
}: {
  action: Parameters<typeof StateForm>[0]["action"];
  hidden: Record<string, string | number>;
  song?: Song;
  submit: string;
  people: Person[];
}) {
  const id = song ? `s${song.id}` : `new${hidden.setRoleId}`;
  // A new song shows in the list straight away; edits keep the usual Saving… then Saved.
  const Form = song ? StateForm : AddSongForm;
  return (
    <Form action={action} className="stack">
      <Hidden values={hidden} />
      <div className="field">
        <label htmlFor={`${id}-title`}>Title</label>
        <input className="input" id={`${id}-title`} name="title" defaultValue={song?.title} list="song-library" required maxLength={120} autoComplete="off" />
      </div>
      <div className="form-row" style={{ gridTemplateColumns: "minmax(0,1fr) 110px" }}>
        <div className="field">
          <label htmlFor={`${id}-artist`}>Artist</label>
          <input className="input" id={`${id}-artist`} name="artist" defaultValue={song?.artist} maxLength={120} autoComplete="off" />
        </div>
        <div className="field">
          <label htmlFor={`${id}-key`}>Key</label>
          <select className="select" id={`${id}-key`} name="songKey" defaultValue={song?.songKey ?? ""}>
            <option value="">Not set</option>
            {KEY_OPTIONS.map((k) => (
              <option key={k} value={k}>
                {k}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div>
        {song ? (
          <SubmitButton className="btn sm primary" pending="Saving…">
            {submit}
          </SubmitButton>
        ) : (
          <button type="submit" className="btn sm primary">
            {submit}
          </button>
        )}
      </div>
    </Form>
  );
}

/** Both sets for a meeting. `compact` is the dashboard view: read-only except for taking open slots. */
export function SongSets({
  sets,
  people,
  token,
  meId,
  organiser,
  meetingId,
  meetingHref,
  library,
  compact,
  readOnly,
}: {
  sets: SetData[];
  people: Person[];
  /** Not needed (and not passed) when `readOnly`. */
  token?: string;
  meId: number | null;
  organiser: boolean;
  meetingId: number;
  meetingHref: string;
  library?: { title: string; artist: string; songKey: string; date: string }[];
  compact?: boolean;
  /** Signed-out view: no claim, add, edit or open-slot controls at all. */
  readOnly?: boolean;
}) {
  return (
    <div className="stack-lg">
      {library ? (
        <datalist id="song-library">
          {library.map((s) => (
            <option key={s.title} value={s.title}>
              {[s.artist, s.songKey && `key ${s.songKey}`].filter(Boolean).join(" · ")}
            </option>
          ))}
        </datalist>
      ) : null}
      {sets.map(({ role, leader, songs }) => {
        const canEdit = !readOnly && (organiser || (meId !== null && leader?.id === meId));
        return (
          <SongDrafts key={role.id}>
          <section aria-labelledby={`set-${role.id}`}>
            <div className="set-head">
              {leader ? <Avatar person={leader} /> : null}
              <h3 id={`set-${role.id}`}>
                {role.name} set
                <span className="muted" style={{ fontWeight: 500 }}>
                  {" "}
                  · {leader ? (meId !== null && leader.id === meId ? "you" : firstName(leader.name)) : "no leader yet"}
                </span>
              </h3>
            </div>
            <div>
              {songs.length === 0 ? (
                <UnlessDrafts>
                  <Pending on={`slot:${meetingId}:${role.id}`} show={null}>
                    <p className="small muted" style={{ padding: "10px 0" }}>
                      {canEdit ? "No songs yet. Add your first one below." : "No songs added yet."}
                    </p>
                  </Pending>
                </UnlessDrafts>
              ) : (
                songs.map((s, i) => (
                  <SongRow
                    key={s.id}
                    song={s}
                    people={people}
                    token={token ?? ""}
                    meId={meId}
                    canEdit={canEdit}
                    first={i === 0}
                    last={i === songs.length - 1}
                    compact={compact}
                    readOnly={readOnly}
                  />
                ))
              )}
              <DraftRows />
              <Pending on={`slot:${meetingId}:${role.id}`} show={<OpenSlot />} />
            </div>
            {readOnly ? null : compact ? (
              canEdit ? (
                <Link className="btn sm ghost" href={`${meetingHref}#songs`} style={{ marginTop: 8 }}>
                  <Plus size={16} aria-hidden /> Add songs
                </Link>
              ) : null
            ) : (
              <div className="stack" style={{ marginTop: 8 }}>
                {canEdit ? (
                  <details className="disclose" open={songs.length === 0}>
                    <summary>
                      <Plus size={18} aria-hidden /> Add a song you&rsquo;ll lead
                    </summary>
                    <SongFields action={addSong} hidden={{ token: token ?? "", meetingId, setRoleId: role.id }} submit="Add song" people={people} />
                  </details>
                ) : null}
                <SaveForm action={addOpenSlot} keys={[`slot:${meetingId}:${role.id}`]}>
                  <Hidden values={{ token: token ?? "", meetingId, setRoleId: role.id }} />
                  <button type="submit" className="btn sm ghost">
                    <Plus size={16} aria-hidden /> Open a song slot for someone else
                  </button>
                </SaveForm>
              </div>
            )}
          </section>
          </SongDrafts>
        );
      })}
    </div>
  );
}
