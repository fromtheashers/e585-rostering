import Link from "next/link";
import { context } from "@/lib/data";
import { Avatar, Mark } from "@/components/ui";
import { TabBar, TabsInline } from "@/components/client";
import { firstName } from "@/lib/palette";

export const dynamic = "force-dynamic";

export default async function GroupLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const { group, me, organiser } = await context(token);
  const nav = !!me || organiser;
  const base = `/g/${token}`;
  return (
    <>
      <header className="topbar">
        <div className="shell topbar-inner">
          <Link href={base} className="brand">
            <Mark />
            <span>{group.name}</span>
          </Link>
          {nav ? <TabsInline base={base} /> : null}
          {me ? (
            <Link href={`${base}/me`} className="topbar-me" aria-label={`Signed in as ${me.name}. Open Me`}>
              <span className="label">{firstName(me.name)}</span>
              <Avatar person={me} />
            </Link>
          ) : null}
        </div>
      </header>
      {children}
      {nav ? <TabBar base={base} /> : null}
    </>
  );
}
