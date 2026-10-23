import Link from "next/link";
import { activeRoles, assignmentsFor, availabilityFor, levelOf, preferencesFor, statusOf, upcomingMeetings } from "@/lib/data";
import { AutoSelect } from "@/components/client";
import { memberContext } from "@/lib/guard";
import { changeMyPin, forgetPerson, setAvailability, setDefaultAvailability, setMaxPerMonth, setPreference } from "@/lib/actions";
import { shortDate } from "@/lib/dates";
import { Avatar, Hidden } from "@/components/ui";
import { AutoSeg, StateForm, SubmitButton } from "@/components/client";

export const metadata = { title: "Me" };

const YES_MAYBE_NO = [
  { value: "yes", label: "Yes" },
  { value: "maybe", label: "Maybe" },
  { value: "no", label: "No" },
];

export default async function MePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const { me, today } = await memberContext(token, "/me");
  const base = `/g/${token}`;

  const [meetings, roles, prefs] = await Promise.all([upcomingMeetings(today, 10), activeRoles(), preferencesFor(me.id)]);
  const ids = meetings.map((m) => m.id);
  const [avail, assignments] = await Promise.all([availabilityFor(ids), assignmentsFor(ids)]);

  return (
    <main className="shell page" style={{ maxWidth: 760 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <Avatar person={me} size="lg" />
        <div>
          <h1 className="title">{me.name}</h1>
          <form action={forgetPerson}>
            <Hidden values={{ token }} />
            <button className="link-btn" type="submit">
              Not you? Switch person
            </button>
          </form>
        </div>
      </div>

      <section aria-labelledby="fri-h" className="stack">
        <div className="section-head" style={{ marginBottom: 0 }}>
          <h2 id="fri-h">Which Fridays are you free?</h2>
          <span className="aside">Saves as you tap</span>
        </div>
        <div className="panel flush">
          {meetings.length === 0 ? (
            <p className="muted small" style={{ padding: "16px 0" }}>
              No meetings are planned yet. They&rsquo;ll appear here when the organiser adds them.
            </p>
          ) : (
            <ul className="row-list">
              {meetings.map((m) => {
                const s = statusOf(avail, me, m.id);
                const serving = assignments
                  .filter((a) => a.meetingId === m.id && a.personId === me.id && a.status === "confirmed")
                  .map((a) => roles.find((r) => r.id === a.roleId)?.name)
                  .filter(Boolean);
                return (
                  <li key={m.id} className="row" style={{ flexWrap: "wrap" }}>
                    <Link href={`${base}/m/${m.date}`} className="row-main row-link">
                      <strong>{shortDate(m.date)}</strong>
                      <span className="row-sub">
                        {serving.length ? `You: ${serving.join(", ")}` : s.explicit ? " " : "Not marked, using your usual"}
                      </span>
                    </Link>
                    <AutoSeg
                      action={setAvailability}
                      name="status"
                      value={s.explicit ? s.status : null}
                      label={`Free on ${shortDate(m.date)}?`}
                      hidden={{ token, meetingId: m.id }}
                      options={YES_MAYBE_NO}
                    />
                  </li>
                );
              })}
            </ul>
          )}
        </div>
        <div className="panel" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <div className="row-main">
            <strong>Usually I&rsquo;m…</strong>
            <span className="row-sub">Used for any Friday you haven&rsquo;t marked.</span>
          </div>
          <AutoSeg
            action={setDefaultAvailability}
            name="status"
            value={me.defaultAvailability}
            label="Usual availability"
            hidden={{ token }}
            options={[
              { value: "yes", label: "Free" },
              { value: "maybe", label: "Maybe" },
              { value: "no", label: "Away" },
            ]}
          />
        </div>
      </section>

      <section aria-labelledby="serve-h" className="stack">
        <div className="section-head" style={{ marginBottom: 0 }}>
          <h2 id="serve-h">Where would you like to serve?</h2>
        </div>
        <div className="panel flush">
          <ul className="row-list">
            {roles.map((r) => (
              <li key={r.id} className="row" style={{ flexWrap: "wrap" }}>
                <span className="row-main">
                  <strong>{r.name}</strong>
                  <span className="row-sub">{r.description || (r.required ? "" : "Optional")}</span>
                </span>
                <AutoSeg
                  action={setPreference}
                  name="level"
                  value={levelOf(prefs, me.id, r.id)}
                  label={`How you feel about ${r.name}`}
                  hidden={{ token, roleId: r.id }}
                  options={[
                    { value: "love", label: "Love" },
                    { value: "happy", label: "Happy" },
                    { value: "rather_not", label: "Rather not" },
                  ]}
                />
              </li>
            ))}
          </ul>
        </div>
        <div className="panel">
          <div className="field">
            <label htmlFor="max">Most times a month you&rsquo;d like to serve</label>
            <span className="hint">Auto-fill won&rsquo;t put you on more than this. Saves when you pick.</span>
            <AutoSelect
              id="max"
              className="select"
              action={setMaxPerMonth}
              hidden={{ token }}
              name="maxPerMonth"
              value={me.maxPerMonth ? String(me.maxPerMonth) : ""}
              options={[
                { value: "", label: "No limit" },
                ...[1, 2, 3, 4].map((n) => ({ value: String(n), label: `${n} ${n === 1 ? "time" : "times"}` })),
              ]}
            />
          </div>
        </div>
      </section>

      <details className="disclose panel">
        <summary>Change my PIN</summary>
        <StateForm action={changeMyPin} className="stack" resetOnOk>
          <Hidden values={{ token }} />
          <div className="field">
            <label htmlFor="current">Current PIN</label>
            <input className="input" id="current" name="current" type="password" inputMode="numeric" pattern="[0-9]{4,6}" maxLength={6} required autoComplete="current-password" />
          </div>
          <div className="form-row" style={{ gridTemplateColumns: "1fr 1fr" }}>
            <div className="field">
              <label htmlFor="pin">New PIN</label>
              <input className="input" id="pin" name="pin" type="password" inputMode="numeric" pattern="[0-9]{4,6}" maxLength={6} required autoComplete="new-password" />
            </div>
            <div className="field">
              <label htmlFor="confirm">Type it again</label>
              <input className="input" id="confirm" name="confirm" type="password" inputMode="numeric" pattern="[0-9]{4,6}" maxLength={6} required autoComplete="new-password" />
            </div>
          </div>
          <div>
            <SubmitButton className="btn sm" pending="Changing…">
              Change PIN
            </SubmitButton>
          </div>
        </StateForm>
      </details>
    </main>
  );
}
