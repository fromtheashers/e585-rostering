import { redirect } from "next/navigation";
import { firstGroup } from "@/lib/data";
import { Mark } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function Root() {
  const group = await firstGroup();
  if (!group) redirect("/setup");
  return (
    <main className="shell page" style={{ maxWidth: 520 }}>
      <Mark size={40} />
      <h1 className="greeting">This roster is private.</h1>
      <p className="lede">Open the link your organiser shared in the group chat. It looks like this address with a code on the end.</p>
    </main>
  );
}
