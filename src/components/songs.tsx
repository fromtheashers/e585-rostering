import Link from "next/link";
import { ArrowDown, ArrowUp, Plus } from "lucide-react";
import type { Person, Role, Song } from "@/db/schema";
import { addOpenSlot, addSong, claimSong, moveSong, releaseSong, removeSong, updateSong } from "@/lib/actions";
import { firstName } from "@/lib/palette";
import { Avatar, Hidden } from "./ui";
import { StateForm, SubmitButton } from "./client";

export const KEY_OPTIONS = ["C", "C#", "Db", "D", "Eb", "E", "F", "F#", "G", "Ab", "A", "Bb", "B", "Cm", "C#m", "Dm", "Ebm", "Em", "Fm", "F#m", "Gm", "G#m", "Am", "Bbm", "Bm"];

interface SetData {
  role: Role;
  leader: Person | null;
  songs: Song[];
}

function SongRow({
  song,
  people,
  token,
  meId,
  canEdit,
  first,
  last,
  compact,
}: {
  song: Song;
  people: Person[];
  token: string;
  meId: number;
  canEdit: boolean;
  first: boolean;
  last: boolean;
  compact?: boolean;
}) {
  const leader = people.find((p) => p.id === song.leaderPersonId) ?? null;
  const mine = song.leaderPersonId === meId;

  if (!leader) {
    return (
      <div className="slot-open">
        <div className="row-main">
          <strong>Open song slot</strong>
          <span className="row-sub">Anyone can lead this one.</span>
        </div>
        <div className="actions">
          <form action={claimSong}>
            <Hidden values={{ token, songId: song.id }} />
            <SubmitButton className="btn sm primary" pending="Taking…">
              I&rsquo;ll lead it
            </SubmitButton>
          </form>
          {canEdit && !compact ? (
            <form action={removeSong}>
              <Hidden values={{ token, songId: song.id }} />
              <SubmitButton className="btn sm ghost">Remove</SubmitButton>
            </form>
          ) : null}
        </div>
      </div>
    );
  }

  const title = song.title || (mine ? "Add your song" : "Song to be picked");
  return (
    <div className="song">
      <div className="row-main">
        <span className="song-title" style={song.title ? undefined : { color: "var(--muted)", fontWeight: 500 }}>
          {title}
        </span>
        <span className="song-meta">
          {[song.artist, `led by ${mine ? "you" : firstName(leader.name)}`].filter(Boolean).join(" · ")}
        </span>
      </div>
      {song.songKey ? (
        <span className="key" aria-label={`Key of ${song.songKey}`}>
          {song.songKey}
        </span>
      ) : (
        <span className="key muted" aria-label="No key yet">
          –
        </span>
      )}
      {!compact && (mine || canEdit) ? (
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
                <form action={releaseSong}>
                  <Hidden values={{ token, songId: song.id }} />
                  <SubmitButton className="btn sm ghost">I can&rsquo;t lead this</SubmitButton>
                </form>
              ) : (
                <form action={removeSong}>
                  <Hidden values={{ token, songId: song.id }} />
                  <SubmitButton className="btn sm danger">Remove song</SubmitButton>
                </form>
              )}
            </div>
          </div>
        </details>
      ) : null}
    </div>
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
  return (
    <StateForm action={action} className="stack" resetOnOk={!song}>
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
        <SubmitButton className="btn sm primary" pending="Saving…">
          {submit}
        </SubmitButton>
      </div>
    </StateForm>
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
}: {
  sets: SetData[];
  people: Person[];
  token: string;
  meId: number;
  organiser: boolean;
  meetingId: number;
  meetingHref: string;
  library?: { title: string; artist: string; songKey: string; date: string }[];
  compact?: boolean;
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
        const canEdit = organiser || leader?.id === meId;
        return (
          <section key={role.id} aria-labelledby={`set-${role.id}`}>
            <div className="set-head">
              {leader ? <Avatar person={leader} /> : null}
              <h3 id={`set-${role.id}`}>
                {role.name} set
                <span className="muted" style={{ fontWeight: 500 }}>
                  {" "}
                  · {leader ? (leader.id === meId ? "you" : firstName(leader.name)) : "no leader yet"}
                </span>
              </h3>
            </div>
            <div>
              {songs.length === 0 ? (
                <p className="small muted" style={{ padding: "10px 0" }}>
                  {canEdit ? "No songs yet. Add your first one below." : "No songs added yet."}
                </p>
              ) : (
                songs.map((s, i) => (
                  <SongRow
                    key={s.id}
                    song={s}
                    people={people}
                    token={token}
                    meId={meId}
                    canEdit={canEdit}
                    first={i === 0}
                    last={i === songs.length - 1}
                    compact={compact}
                  />
                ))
              )}
            </div>
            {compact ? (
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
                    <SongFields action={addSong} hidden={{ token, meetingId, setRoleId: role.id }} submit="Add song" people={people} />
                  </details>
                ) : null}
                <form action={addOpenSlot}>
                  <Hidden values={{ token, meetingId, setRoleId: role.id }} />
                  <SubmitButton className="btn sm ghost" pending="Opening…">
                    <Plus size={16} aria-hidden /> Open a song slot for someone else
                  </SubmitButton>
                </form>
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}
