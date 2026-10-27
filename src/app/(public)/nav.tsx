"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/** The signed-out main nav, marking the page you are on. Meeting pages count as Home. */
export function PublicNav() {
  const path = usePathname();
  const home = path === "/" || path.startsWith("/m/");
  const calendar = path.startsWith("/calendar");
  return (
    <nav className="tabs-inline always" aria-label="Main">
      <Link href="/" aria-current={home ? "page" : undefined}>
        Home
      </Link>
      <Link href="/calendar" aria-current={calendar ? "page" : undefined}>
        Calendar
      </Link>
    </nav>
  );
}
