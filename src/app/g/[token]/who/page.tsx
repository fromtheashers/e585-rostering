import Link from "next/link";
import { activePeople, context } from "@/lib/data";
import { Avatar } from "@/components/ui";
import type { Person } from "@/db/schema";

export const metadata = { title: "Who are you?" };

export default async function Who({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ next?: string }>;
}) {
  const { token } = await params;
  const { next } = await searchParams;
  const { group } = await context(token);
  const people = await activePeople();
  const open = people.filter((p) => !p.pinHash);
  const taken = people.filter((p) => p.pinHash);
  const href = (p: Person) => `/g/${token}/who/${p.id}${next ? `?next=${encodeURIComponent(next)}` : ""}`;

  return (
    <main className="shell page" style={{ maxWidth: 720 }}>
      <div>
        <h1 className="greeting">Who are you?</h1>
        <p className="lede">Tap your name and make a PIN. Once you have, nobody else can pick your name.</p>
      </div>

      {people.length === 0 ? (
        <div className="empty">
          <strong>Nobody has been added to {group.name} yet.</strong>
          <p className="muted">The owner adds everyone&rsquo;s names first.</p>
        </div>
      ) : open.length === 0 ? (
        <p className="small muted">Everyone on the list has made a PIN. If yours is below, tap it and enter your PIN.</p>
      ) : (
        <div className="names">
          {open.map((p) => (
            <Link key={p.id} href={href(p)} className="name-btn">
              <Avatar person={p} size="lg" />
              {p.name}
            </Link>
          ))}
        </div>
      )}

      {taken.length ? (
        <section aria-labelledby="taken-h">
          <div className="section-head">
            <h2 id="taken-h">Already made your PIN?</h2>
            <span className="aside">For signing in on another phone</span>
          </div>
          <ul className="row-list">
            {taken.map((p) => (
              <li key={p.id}>
                <Link href={href(p)} className="row" style={{ minHeight: 48 }}>
                  <Avatar person={p} />
                  <span className="row-main">
                    <strong>{p.name}</strong>
                  </span>
                  <span className="small muted">Enter PIN</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {people.length > 0 ? <p className="small muted">Not on the list? Ask the owner or an admin to add you.</p> : null}
    </main>
  );
}
