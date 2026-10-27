import { groupByToken } from "@/lib/data";

export const dynamic = "force-dynamic";

/**
 * "Add to Home Screen" for this group. It is per link, so the icon opens this group's roster
 * rather than the private landing page at "/". After a new link is made, people add it again.
 */
export async function GET(_: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const group = await groupByToken(token);
  if (!group) return new Response("Not found", { status: 404 });
  const manifest = {
    name: `${group.name} Rostering`,
    short_name: group.name,
    description: "Who's serving on Friday, what's still open, and the songs.",
    id: `/g/${token}`,
    start_url: `/g/${token}`,
    scope: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#ffffff",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
  return new Response(JSON.stringify(manifest), {
    headers: {
      "Content-Type": "application/manifest+json",
      "Cache-Control": "private, no-cache",
      "Referrer-Policy": "no-referrer",
    },
  });
}
