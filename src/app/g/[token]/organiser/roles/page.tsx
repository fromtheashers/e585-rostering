import Link from "next/link";
import { ArrowDown, ArrowLeft, ArrowUp } from "lucide-react";
import { allRoles } from "@/lib/data";
import { organiserContext } from "@/lib/guard";
import { addRole, moveRole, setPairs, setRoleActive, updateRole } from "@/lib/actions";
import { pairAllowed } from "@/lib/autofill";
import { Hidden } from "@/components/ui";
import { StateForm, SubmitButton } from "@/components/client";

export const metadata = { title: "Roles" };

function RoleFields({ id, role }: { id: string; role?: { name: string; description: string; required: boolean; hasSongs: boolean } }) {
  return (
    <>
      <div className="field">
        <label htmlFor={`${id}-name`}>Name</label>
        <input className="input" id={`${id}-name`} name="name" defaultValue={role?.name} maxLength={40} required />
      </div>
      <div className="field">
        <label htmlFor={`${id}-desc`}>Short description</label>
        <input className="input" id={`${id}-desc`} name="description" defaultValue={role?.description} maxLength={80} placeholder="Shown on Me, under the role" />
      </div>
      <label className="check">
        <input type="checkbox" name="required" defaultChecked={role?.required ?? true} />
        Needed every meeting (an empty slot shows as open)
      </label>
      <label className="check">
        <input type="checkbox" name="hasSongs" defaultChecked={role?.hasSongs ?? false} />
        Leads a song set (title, artist and key)
      </label>
    </>
  );
}

export default async function Roles({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const { group } = await organiserContext(token, "/organiser/roles");
  const base = `/g/${token}`;
  const roles = await allRoles();
  const active = roles.filter((r) => r.active);
  const retired = roles.filter((r) => !r.active);
  const pairs = active.flatMap((a, i) => active.slice(i + 1).map((b) => [a, b] as const));

  return (
    <main className="shell page" style={{ maxWidth: 760 }}>
      <Link href={`${base}/more`} className="backlink">
        <ArrowLeft size={18} aria-hidden /> More
      </Link>
      <div>
        <h1 className="greeting">Roles</h1>
        <p className="lede">One person serves in each role at a meeting. Order here is the order on the roster.</p>
      </div>

      <ul className="row-list">
        {active.map((r, i) => (
          <li key={r.id} className="row" style={{ display: "block" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span className="row-main">
                <strong>{r.name}</strong>
                <span className="row-sub">
                  {[r.required ? "Needed every meeting" : "Optional", r.hasSongs ? "leads a song set" : ""].filter(Boolean).join(" · ")}
                </span>
              </span>
              {i > 0 ? (
                <form action={moveRole}>
                  <Hidden values={{ token, roleId: r.id, dir: "up" }} />
                  <button className="btn sm ghost" type="submit" aria-label={`Move ${r.name} earlier`}>
                    <ArrowUp size={16} aria-hidden />
                  </button>
                </form>
              ) : null}
              {i < active.length - 1 ? (
                <form action={moveRole}>
                  <Hidden values={{ token, roleId: r.id, dir: "down" }} />
                  <button className="btn sm ghost" type="submit" aria-label={`Move ${r.name} later`}>
                    <ArrowDown size={16} aria-hidden />
                  </button>
                </form>
              ) : null}
            </div>
            <details className="disclose">
              <summary className="small muted">Edit {r.name}</summary>
              <StateForm action={updateRole} className="stack" >
                <Hidden values={{ token, roleId: r.id }} />
                <RoleFields id={`r${r.id}`} role={r} />
                <div className="actions">
                  <SubmitButton className="btn sm primary" pending="Saving…">
                    Save
                  </SubmitButton>
                </div>
              </StateForm>
              <form action={setRoleActive} style={{ padding: "8px 0 12px" }}>
                <Hidden values={{ token, roleId: r.id, active: "0" }} />
                <SubmitButton className="btn sm danger" pending="Retiring…">
                  Retire this role
                </SubmitButton>
              </form>
            </details>
          </li>
        ))}
      </ul>

      <details className="disclose panel">
        <summary>Add a role</summary>
        <StateForm action={addRole} className="stack" resetOnOk>
          <Hidden values={{ token }} />
          <RoleFields id="new" />
          <div>
            <SubmitButton className="btn sm primary" pending="Adding…">
              Add role
            </SubmitButton>
          </div>
        </StateForm>
      </details>

      {pairs.length ? (
        <section aria-labelledby="pairs-h">
          <div className="section-head">
            <h2 id="pairs-h">Roles one person can do together</h2>
          </div>
          <p className="small muted" style={{ marginBottom: 8 }}>
            Auto-fill gives each person one role per meeting, except these pairs. People can always sign up for more themselves.
          </p>
          <form action={setPairs} className="panel stack">
            <Hidden values={{ token }} />
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: "0 16px" }}>
              {pairs.map(([a, b]) => (
                <label key={`${a.id}-${b.id}`} className="check">
                  <input type="checkbox" name="pair" value={`${a.id}-${b.id}`} defaultChecked={pairAllowed(group.allowedPairs, a.id, b.id)} />
                  {a.name} + {b.name}
                </label>
              ))}
            </div>
            <div>
              <SubmitButton className="btn sm" pending="Saving…">
                Save pairs
              </SubmitButton>
            </div>
          </form>
        </section>
      ) : null}

      {retired.length ? (
        <section aria-labelledby="retired-h">
          <div className="section-head">
            <h2 id="retired-h">Retired roles</h2>
          </div>
          <ul className="row-list">
            {retired.map((r) => (
              <li key={r.id} className="row">
                <span className="row-main">
                  <strong className="muted">{r.name}</strong>
                </span>
                <form action={setRoleActive}>
                  <Hidden values={{ token, roleId: r.id, active: "1" }} />
                  <SubmitButton className="btn sm ghost">Bring back</SubmitButton>
                </form>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </main>
  );
}
