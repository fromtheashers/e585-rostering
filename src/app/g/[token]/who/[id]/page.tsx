import Link from "next/link";
import { notFound } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { ArrowLeft } from "lucide-react";
import { db, schema } from "@/db";
import { context } from "@/lib/data";
import { signIn } from "@/lib/actions";
import { firstName } from "@/lib/palette";
import { Avatar, Hidden } from "@/components/ui";
import { StateForm, SubmitButton } from "@/components/client";

export const metadata = { title: "Your PIN" };

const pinInput = { className: "input pin", type: "password", inputMode: "numeric", pattern: "[0-9]{4,6}", maxLength: 6, required: true } as const;

export default async function SignIn({
  params,
  searchParams,
}: {
  params: Promise<{ token: string; id: string }>;
  searchParams: Promise<{ next?: string }>;
}) {
  const { token, id } = await params;
  const { next } = await searchParams;
  await context(token);
  const personId = Number(id);
  if (!Number.isInteger(personId)) notFound();
  const [p] = await db()
    .select()
    .from(schema.people)
    .where(and(eq(schema.people.id, personId), eq(schema.people.active, true)));
  if (!p) notFound();
  const fresh = !p.pinHash;

  return (
    <main className="shell page" style={{ maxWidth: 520 }}>
      <Link href={`/g/${token}/who`} className="backlink">
        <ArrowLeft size={18} aria-hidden /> Not {firstName(p.name)}?
      </Link>
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <Avatar person={p} size="lg" />
        <div>
          <h1 className="greeting sub">{fresh ? `Hi ${firstName(p.name)}` : `Welcome back, ${firstName(p.name)}`}</h1>
        </div>
      </div>
      <p className="lede">
        {fresh
          ? "Make a PIN of 4 to 6 digits. You'll use it if you sign in on another phone, and it keeps your name yours."
          : "Enter your PIN. This phone will remember you after this."}
      </p>
      <StateForm action={signIn} className="panel stack">
        <Hidden values={{ token, personId: p.id, next: next ?? "" }} />
        {fresh ? (
          <div className="form-row" style={{ gridTemplateColumns: "1fr 1fr" }}>
            <div className="field">
              <label htmlFor="pin">New PIN</label>
              <input {...pinInput} id="pin" name="pin" autoFocus autoComplete="new-password" />
            </div>
            <div className="field">
              <label htmlFor="confirm">Type it again</label>
              <input {...pinInput} id="confirm" name="confirm" autoComplete="new-password" />
            </div>
          </div>
        ) : (
          <div className="field">
            <label htmlFor="pin">PIN</label>
            <input {...pinInput} id="pin" name="pin" autoFocus autoComplete="current-password" />
          </div>
        )}
        <div>
          <SubmitButton className="btn primary" pending={fresh ? "Saving…" : "Checking…"}>
            {fresh ? "Make my PIN" : "Sign in"}
          </SubmitButton>
        </div>
      </StateForm>
      {fresh ? null : <p className="small muted">Forgot it? The owner or an admin can reset it, then you make a new one here.</p>}
    </main>
  );
}
