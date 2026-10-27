import { activeRoles, assignmentsFor, upcomingMeetings } from "@/lib/data";
import { memberContext } from "@/lib/guard";
import { joinList } from "@/lib/roster";

export const dynamic = "force-dynamic";

/** Text values in a calendar file escape these characters. */
function esc(text: string) {
  return text.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
}

/** Calendar lines longer than 75 bytes are folded onto continuation lines that start with a space. */
function fold(line: string) {
  const bytes = new TextEncoder().encode(line);
  if (bytes.length <= 75) return line;
  const out: string[] = [];
  let start = 0;
  while (start < bytes.length) {
    let end = Math.min(start + (out.length ? 74 : 75), bytes.length);
    // Never split a multi-byte character.
    while (end < bytes.length && (bytes[end] & 0xc0) === 0x80) end--;
    out.push((out.length ? " " : "") + new TextDecoder().decode(bytes.slice(start, end)));
    start = end;
  }
  return out.join("\r\n");
}

/**
 * The Fridays you're serving, as a calendar file your phone can add in one go. Times are
 * "floating" (no time zone), so 7:30pm shows as 7:30pm on a phone in the group's own time zone.
 * Each event keeps the same id, so adding the file again updates the events instead of doubling them.
 */
export async function GET(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const { group, me, today } = await memberContext(token, "/me");
  const [meetings, roles] = await Promise.all([upcomingMeetings(today, 26), activeRoles()]);
  const assignments = await assignmentsFor(meetings.map((m) => m.id));
  const origin = new URL(request.url).origin;
  const stamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d+Z$/, "Z");

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//E585 Rostering//Serving dates//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${esc(`${group.name} serving`)}`,
  ];
  for (const m of meetings) {
    const mine = roles
      .filter((r) => assignments.some((a) => a.meetingId === m.id && a.roleId === r.id && a.personId === me.id && a.status === "confirmed"))
      .map((r) => r.name);
    if (mine.length === 0) continue;
    const time = (m.startTime ?? group.startTime).replace(":", "").padEnd(4, "0").slice(0, 4);
    const url = `${origin}/g/${token}/m/${m.date}`;
    lines.push(
      "BEGIN:VEVENT",
      `UID:e585-${group.id}-${m.id}-${me.id}@e585-rostering`,
      `DTSTAMP:${stamp}`,
      `DTSTART:${m.date.replace(/-/g, "")}T${time}00`,
      `SUMMARY:${esc(`${group.name}: ${joinList(mine)}`)}`,
      `DESCRIPTION:${esc(`You're on ${joinList(mine)}. Roster and songs: ${url}`)}`,
      `URL:${url}`,
      "END:VEVENT",
    );
  }
  lines.push("END:VCALENDAR");

  return new Response(lines.map(fold).join("\r\n") + "\r\n", {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'attachment; filename="e585-serving.ics"',
      "Cache-Control": "private, no-store",
      "Referrer-Policy": "no-referrer",
    },
  });
}
