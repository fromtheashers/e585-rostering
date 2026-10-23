import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { ownerOf } from "@/lib/data";
import { memberContext } from "@/lib/guard";
import { claimOwner } from "@/lib/actions";
import { Hidden } from "@/components/ui";
import { StateForm, SubmitButton } from "@/components/client";

export const metadata = { title: "Become the owner" };

/** Only for a group set up before everyone had their own PIN. */
export default async function ClaimOwner({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const { group, me } = await memberContext(token, "/organiser/unlock");
  const base = `/g/${token}`;
  if (!group.pinHash || (await ownerOf())) redirect(`${base}/more`);

  return (
    <main className="shell page" style={{ maxWidth: 520 }}>
      <Link href={`${base}/more`} className="backlink">
        <ArrowLeft size={18} aria-hidden /> Back
      </Link>
      <div>
        <h1 className="greeting sub">Become the owner</h1>
        <p className="lede">
          Enter the old organiser PIN once. {me.name} becomes the owner, and after that you sign in with your own PIN
          like everyone else.
        </p>
      </div>
      <StateForm action={claimOwner} className="panel stack">
        <Hidden values={{ token }} />
        <div className="field">
          <label htmlFor="pin">Old organiser PIN</label>
          <input className="input pin" id="pin" name="pin" type="password" inputMode="numeric" pattern="[0-9]{4,6}" maxLength={6} required autoFocus autoComplete="off" />
        </div>
        <div>
          <SubmitButton className="btn primary" pending="Checking…">
            Make me the owner
          </SubmitButton>
        </div>
      </StateForm>
    </main>
  );
}
