import Link from "next/link";
import { firstGroup } from "@/lib/data";
import { Mark } from "@/components/ui";

export const dynamic = "force-dynamic";

/** The signed-out top bar: the group's name, two read-only pages and a Sign in button. */
export default async function PublicLayout({ children }: { children: React.ReactNode }) {
  const group = await firstGroup();
  return (
    <>
      <header className="topbar">
        <div className="shell topbar-inner">
          <Link href="/" className="brand">
            <Mark />
            <span>{group?.name ?? "E585 Rostering"}</span>
          </Link>
          <nav className="tabs-inline always" aria-label="Main">
            <Link href="/">Home</Link>
            <Link href="/calendar">Calendar</Link>
          </nav>
          <Link href="/sign-in" className="btn sm topbar-signin">
            Sign in
          </Link>
        </div>
      </header>
      {children}
    </>
  );
}
