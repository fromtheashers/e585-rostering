import Link from "next/link";
import { Mark } from "@/components/ui";
import { publicGroup } from "./group";
import { PublicNav } from "./nav";

export const dynamic = "force-dynamic";

/** The signed-out top bar: the group's name, two read-only pages and a Sign in button. */
export default async function PublicLayout({ children }: { children: React.ReactNode }) {
  const group = await publicGroup();
  return (
    <>
      <header className="topbar">
        <div className="shell topbar-inner">
          <Link href="/" className="brand">
            <Mark />
            <span>{group?.name ?? "E585 Rostering"}</span>
          </Link>
          <PublicNav />
          <Link href="/sign-in" className="btn sm topbar-signin">
            Sign in
          </Link>
        </div>
      </header>
      {children}
    </>
  );
}
