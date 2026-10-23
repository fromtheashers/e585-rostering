/**
 * Shown the moment a tab or link is tapped, while the server builds the page.
 * It fades in after a short delay, so fast loads never flash it.
 */
export default function Loading() {
  return (
    <main className="shell page loading" aria-busy="true" aria-label="Loading">
      <div>
        <div className="bone bone-title" />
        <div className="bone bone-line" />
      </div>
      <div className="stack-lg">
        <div className="bone bone-block" />
        <div className="bone bone-block short" />
      </div>
    </main>
  );
}
