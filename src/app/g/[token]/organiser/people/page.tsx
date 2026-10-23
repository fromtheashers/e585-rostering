import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { allPeople } from "@/lib/data";
import { organiserContext } from "@/lib/guard";
import { addPerson, renamePerson, setPersonActive, setPersonHue } from "@/lib/actions";
import { JEWELS } from "@/lib/palette";
import { Avatar, Hidden } from "@/components/ui";
import { ConfirmButton, StateForm, SubmitButton, Toast } from "@/components/client";

export const metadata = { title: "People" };

export default async function People({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ welcome?: string }>;
}) {
  const { token } = await params;
  const { welcome } = await searchParams;
  const { me } = await organiserContext(token, "/organiser/people");
  const base = `/g/${token}`;
  const everyone = await allPeople();
  const active = everyone.filter((p) => p.active);
  const removed = everyone.filter((p) => !p.active);

  return (
    <main className="shell page" style={{ maxWidth: 760 }}>
      <Link href={`${base}/more`} className="backlink">
        <ArrowLeft size={18} aria-hidden /> More
      </Link>
      <div>
        <h1 className="greeting sub">People</h1>
        <p className="lede">These names appear on the &ldquo;Who are you?&rdquo; screen. Everyone gets their own colour.</p>
      </div>

      {welcome ? <Toast message="Your roster is ready. Add everyone's names." /> : null}

      <StateForm action={addPerson} className="panel stack" resetOnOk>
        <Hidden values={{ token }} />
        <div className="form-row">
          <div className="field">
            <label htmlFor="new-name">Add a name</label>
            <input className="input" id="new-name" name="name" placeholder="First and last name" maxLength={60} required autoComplete="off" />
          </div>
          <SubmitButton className="btn primary" pending="Adding…">
            Add
          </SubmitButton>
        </div>
      </StateForm>

      <section aria-labelledby="list-h">
        <div className="section-head">
          <h2 id="list-h">On the list</h2>
          <span className="aside num">{active.length} {active.length === 1 ? "person" : "people"}</span>
        </div>
        {active.length === 0 ? (
          <p className="small muted">Nobody yet. Add the first name above.</p>
        ) : (
          <ul className="row-list">
            {active.map((p) => (
              <li key={p.id} className="row" style={{ display: "block" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <Avatar person={p} />
                  <span className="row-main">
                    <strong>{p.name}</strong>
                    <span className="row-sub">{p.id === me?.id ? "This is you on this device" : JEWELS[p.hue]?.name}</span>
                  </span>
                </div>
                <details className="disclose">
                  <summary className="small muted">Edit {p.name.split(" ")[0]}</summary>
                  <div className="stack" style={{ paddingBottom: 12 }}>
                    <form action={renamePerson} className="form-row">
                      <Hidden values={{ token, personId: p.id }} />
                      <div className="field">
                        <label htmlFor={`name-${p.id}`}>Name</label>
                        <input className="input" id={`name-${p.id}`} name="name" defaultValue={p.name} maxLength={60} required />
                      </div>
                      <SubmitButton className="btn" pending="Saving…">
                        Rename
                      </SubmitButton>
                    </form>
                    <form action={setPersonHue} className="form-row">
                      <Hidden values={{ token, personId: p.id }} />
                      <div className="field">
                        <label htmlFor={`hue-${p.id}`}>Colour</label>
                        <select className="select" id={`hue-${p.id}`} name="hue" defaultValue={p.hue}>
                          {JEWELS.map((j, i) => (
                            <option key={j.name} value={i}>
                              {j.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      <SubmitButton className="btn" pending="Saving…">
                        Set colour
                      </SubmitButton>
                    </form>
                    <form action={setPersonActive}>
                      <Hidden values={{ token, personId: p.id, active: "0" }} />
                      <ConfirmButton question={`Remove ${p.name}? Their upcoming slots open up.`} confirm="Remove">
                        Remove from the list
                      </ConfirmButton>
                    </form>
                  </div>
                </details>
              </li>
            ))}
          </ul>
        )}
      </section>

      {removed.length ? (
        <section aria-labelledby="removed-h">
          <div className="section-head">
            <h2 id="removed-h">Removed</h2>
            <span className="aside">Their past roles and songs are kept</span>
          </div>
          <ul className="row-list">
            {removed.map((p) => (
              <li key={p.id} className="row">
                <Avatar person={p} />
                <span className="row-main">
                  <strong className="muted">{p.name}</strong>
                </span>
                <form action={setPersonActive}>
                  <Hidden values={{ token, personId: p.id, active: "1" }} />
                  <SubmitButton className="btn sm ghost" pending="Restoring…">
                    Bring back
                  </SubmitButton>
                </form>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {active.length > 0 ? (
        <div className="panel stack">
          <p className="small">
            <strong>Next:</strong> add the Fridays you meet, then share the group link from More.
          </p>
          <div className="actions">
            <Link className="btn sm primary" href={`${base}/calendar`}>
              Add meeting Fridays
            </Link>
            {!me ? (
              <Link className="btn sm ghost" href={`${base}/who`}>
                Pick my own name
              </Link>
            ) : null}
          </div>
        </div>
      ) : null}
    </main>
  );
}
