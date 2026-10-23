import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { context } from "@/lib/data";
import { unlock } from "@/lib/actions";
import { Hidden } from "@/components/ui";
import { StateForm, SubmitButton } from "@/components/client";

export const metadata = { title: "Organiser" };

export default async function Unlock({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ next?: string }>;
}) {
  const { token } = await params;
  const { next } = await searchParams;
  const { organiser } = await context(token);
  const base = `/g/${token}`;
  if (organiser) redirect(next?.startsWith(base) ? next : `${base}/more`);

  return (
    <main className="shell page" style={{ maxWidth: 520 }}>
      <Link href={`${base}/more`} className="backlink">
        <ArrowLeft size={18} aria-hidden /> Back
      </Link>
      <div>
        <h1 className="greeting sub">Organiser PIN</h1>
        <p className="lede">Use the organiser PIN, or your own admin PIN. It unlocks people, roles, meeting Fridays and the roster grid on this device.</p>
      </div>
      <StateForm action={unlock} className="panel stack">
        <Hidden values={{ token, next: next ?? "" }} />
        <div className="field">
          <label htmlFor="pin">PIN</label>
          <input
            className="input pin"
            id="pin"
            name="pin"
            inputMode="numeric"
            pattern="[0-9]{4,6}"
            maxLength={6}
            required
            autoFocus
            autoComplete="current-password"
          />
        </div>
        <div>
          <SubmitButton className="btn primary" pending="Checking…">
            Unlock
          </SubmitButton>
        </div>
      </StateForm>
    </main>
  );
}
