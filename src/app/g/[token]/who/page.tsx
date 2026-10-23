import Link from "next/link";
import { activePeople, context } from "@/lib/data";
import { choosePerson } from "@/lib/actions";
import { Avatar, Hidden } from "@/components/ui";

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
  const { group, me, organiser } = await context(token);
  const people = await activePeople();

  return (
    <main className="shell page" style={{ maxWidth: 720 }}>
      <div>
        <h1 className="greeting">Who are you?</h1>
        <p className="lede">Tap your name. This phone will remember it, so you only do this once.</p>
      </div>

      {people.length === 0 ? (
        <div className="empty">
          <strong>Nobody has been added to {group.name} yet.</strong>
          <p className="muted">The organiser adds everyone&rsquo;s names first.</p>
          <Link className="btn primary" href={organiser ? `/g/${token}/organiser/people` : `/g/${token}/organiser/unlock?next=/g/${token}/organiser/people`}>
            I&rsquo;m the organiser: add names
          </Link>
        </div>
      ) : (
        <div className="names">
          {people.map((p) => (
            <form key={p.id} action={choosePerson}>
              <Hidden values={{ token, personId: p.id, next: next ?? "" }} />
              <button type="submit" className="name-btn" aria-pressed={me?.id === p.id}>
                <Avatar person={p} size="lg" />
                {p.name}
              </button>
            </form>
          ))}
        </div>
      )}

      {people.length > 0 ? (
        <p className="small muted">
          Not on the list? Ask the organiser to add you.{" "}
          <Link href={`/g/${token}/organiser/unlock?next=/g/${token}/organiser/people`}>Organiser</Link>
        </p>
      ) : null}
    </main>
  );
}
