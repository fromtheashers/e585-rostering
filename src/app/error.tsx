"use client";

import Link from "next/link";

export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main id="main-content" tabIndex={-1} className="shell page" style={{ maxWidth: 560 }}>
      <div>
        <h1 className="greeting sub">We couldn&rsquo;t load this page.</h1>
        <p className="lede">Check your connection and try again. If it keeps happening, come back in a moment.</p>
      </div>
      <div className="actions">
        <button type="button" className="btn primary" onClick={reset}>Try again</button>
        <Link href="/" className="btn ghost">Back to home</Link>
      </div>
    </main>
  );
}
