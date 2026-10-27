import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { activePeople, currentPerson, firstGroup } from "@/lib/data";
import { Avatar } from "@/components/ui";

export const dynamic = "force-dynamic";
export const metadata = { title: "Sign in" };

export default async function PublicSignIn() {
  const group = await firstGroup();
  if (!group) redirect("/setup");
  const [me, people] = await Promise.all([currentPerson(group), activePeople()]);
  if (me) redirect(`/g/${group.linkToken}`);
  const withPin = people.filter((p) => p.pinHash);

  return (
    <main className="shell page" style={{ maxWidth: 720 }}>
      <Link href="/" className="backlink">
        <ArrowLeft size={18} aria-hidden /> Back to the roster
      </Link>
      <div>
        <h1 className="greeting">Sign in</h1>
        <p className="lede">Tap your name and enter your PIN.</p>
      </div>

      {withPin.length === 0 ? (
        <div className="empty">
          <strong>Nobody has made a PIN yet. Open the group link your organiser shared.</strong>
        </div>
      ) : (
        <ul className="row-list">
          {withPin.map((p) => (
            <li key={p.id}>
              <Link href={`/sign-in/${p.id}`} className="row" style={{ minHeight: 48 }}>
                <Avatar person={p} />
                <span className="row-main">
                  <strong>{p.name}</strong>
                </span>
                <span className="small muted">Enter PIN</span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <p className="small muted">Not on the list, or never made a PIN? Open the group link your organiser shared.</p>
    </main>
  );
}
