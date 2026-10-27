import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { ArrowLeft } from "lucide-react";
import { db, schema } from "@/db";
import { firstGroup } from "@/lib/data";
import { signInPublic } from "@/lib/actions";
import { firstName } from "@/lib/palette";
import { Avatar, Hidden } from "@/components/ui";
import { StateForm, SubmitButton } from "@/components/client";

export const dynamic = "force-dynamic";
export const metadata = { title: "Your PIN" };

const pinInput = { className: "input pin", type: "password", inputMode: "numeric", pattern: "[0-9]{4,6}", maxLength: 6, required: true } as const;

export default async function PublicPin({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const personId = Number(id);
  if (!Number.isInteger(personId)) notFound();
  const [group, [p]] = await Promise.all([
    firstGroup(),
    db()
      .select()
      .from(schema.people)
      .where(and(eq(schema.people.id, personId), eq(schema.people.active, true))),
  ]);
  if (!group) redirect("/setup");
  if (!p) notFound();

  return (
    <main className="shell page" style={{ maxWidth: 520 }}>
      <Link href="/sign-in" className="backlink">
        <ArrowLeft size={18} aria-hidden /> Not {firstName(p.name)}?
      </Link>
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <Avatar person={p} size="lg" />
        <div>
          <h1 className="greeting sub">{p.pinHash ? `Welcome back, ${firstName(p.name)}` : `Hi ${firstName(p.name)}`}</h1>
        </div>
      </div>
      {p.pinHash ? (
        <>
          <p className="lede">Enter your PIN. This phone will remember you after this.</p>
          <StateForm action={signInPublic} className="panel stack">
            <Hidden values={{ personId: p.id }} />
            <div className="field">
              <label htmlFor="pin">PIN</label>
              <input {...pinInput} id="pin" name="pin" autoFocus autoComplete="current-password" />
            </div>
            <div>
              <SubmitButton className="btn primary" pending="Checking…">
                Sign in
              </SubmitButton>
            </div>
          </StateForm>
          <p className="small muted">Forgot it? The owner or an admin can reset it, then you make a new one from the group link.</p>
        </>
      ) : (
        <p className="lede">You haven&rsquo;t made a PIN yet. Open the group link your organiser shared to make one.</p>
      )}
    </main>
  );
}
