import type { Assignment, Meeting, Person, Role, Song } from "@/db/schema";
import type { PaneData } from "@/components/ui";
import { firstName } from "./palette";
import { longDate, prettyTime, shortDate } from "./dates";

export function panesFor(meetingId: number, roles: Role[], assignments: Assignment[], people: Person[]): PaneData[] {
  return roles.map((r) => {
    const a = assignments.find((x) => x.meetingId === meetingId && x.roleId === r.id);
    const person = a ? (people.find((p) => p.id === a.personId) ?? null) : null;
    return { roleId: r.id, roleName: r.name, required: r.required, person, suggested: a?.status === "suggested" };
  });
}

export function setsFor(meetingId: number, songRoles: Role[], panes: PaneData[], people: Person[], songs: Song[]) {
  return songRoles.map((role) => {
    const pane = panes.find((p) => p.roleId === role.id);
    const leaderId = pane && !pane.suggested ? pane.person?.id : undefined;
    return {
      role,
      leader: people.find((p) => p.id === leaderId) ?? null,
      songs: songs.filter((s) => s.meetingId === meetingId && s.setRoleId === role.id),
    };
  });
}

export function myRoles(panes: PaneData[], meId: number | null): string[] {
  if (!meId) return [];
  return panes.filter((p) => p.person?.id === meId && !p.suggested).map((p) => p.roleName);
}

export function joinList(items: string[]): string {
  if (items.length <= 1) return items.join("");
  return `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
}

/** Plain text for pasting into the group chat. */
export function rosterText(opts: {
  groupName: string;
  startTime: string;
  meetings: Meeting[];
  roles: Role[];
  assignments: Assignment[];
  people: Person[];
  songs: Song[];
  link: string;
}): string {
  const lines: string[] = [`${opts.groupName} serving roster`];
  for (const m of opts.meetings) {
    lines.push("", `${longDate(m.date)}, ${prettyTime(m.startTime ?? opts.startTime)}`);
    for (const p of panesFor(m.id, opts.roles, opts.assignments, opts.people)) {
      const who = p.person && !p.suggested ? p.person.name : p.required ? "needs someone" : "nobody yet";
      lines.push(`${p.roleName}: ${who}`);
    }
    const set = opts.songs.filter((s) => s.meetingId === m.id && s.title);
    if (set.length) {
      lines.push(`Songs: ${set.map((s) => (s.songKey ? `${s.title} (${s.songKey})` : s.title)).join(", ")}`);
    }
  }
  lines.push("", `Offer to serve or check the roster: ${opts.link}`);
  return lines.join("\n");
}

export function coverText(opts: { roleName: string; date: string; link: string }): string {
  return `Can anyone cover ${opts.roleName} on ${shortDate(opts.date)}? Tap the link if you can: ${opts.link}`;
}

export function greetingFor(opts: { me: Person; mine: string[]; open: number; when: string }): string {
  const name = firstName(opts.me.name);
  if (opts.mine.length) return `${name}, you're on ${joinList(opts.mine)} ${opts.when}.`;
  if (opts.open > 0) return `${name}, ${opts.open === 1 ? "one slot is" : `${opts.open} slots are`} open ${opts.when}.`;
  return `${name}, everything's covered ${opts.when}.`;
}
