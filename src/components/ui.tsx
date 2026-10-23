import { Fragment, type CSSProperties, type ReactNode } from "react";
import Link from "next/link";
import type { Person } from "@/db/schema";
import { JEWELS, firstName, initials, jewel } from "@/lib/palette";
import { Pending } from "./optimistic";

export function jewelStyle(hue: number): CSSProperties {
  return { "--jewel": jewel(hue).value } as CSSProperties;
}

export function Avatar({ person, size }: { person: Pick<Person, "name" | "hue">; size?: "lg" }) {
  return (
    <span className={`avatar${size ? ` ${size}` : ""}`} style={jewelStyle(person.hue)} aria-hidden>
      {initials(person.name)}
    </span>
  );
}

/** The group's mark: four leaded panes. */
export function Mark({ size = 26 }: { size?: number }) {
  const s = size;
  const g = 2;
  const h = (s - g * 3) / 2;
  const cells = [
    [g, g, JEWELS[0].value],
    [g * 2 + h, g, JEWELS[1].value],
    [g, g * 2 + h, JEWELS[2].value],
    [g * 2 + h, g * 2 + h, JEWELS[4].value],
  ] as const;
  return (
    <svg width={s} height={s} viewBox={`0 0 ${s} ${s}`} aria-hidden focusable="false">
      <rect width={s} height={s} rx={7} fill="var(--lead)" />
      {cells.map(([x, y, fill], i) => (
        <rect
          key={i}
          x={x}
          y={y}
          width={h}
          height={h}
          fill={fill}
          rx={2}
        />
      ))}
    </svg>
  );
}

export interface PaneData {
  roleId: number;
  roleName: string;
  required: boolean;
  person: Pick<Person, "id" | "name" | "hue"> | null;
  suggested?: boolean;
}

type Who = Pick<Person, "id" | "name" | "hue">;

function FilledPane({ pane, person, mine, href }: { pane: PaneData; person: Who; mine: boolean; href: string }) {
  return (
    <Link role="listitem" href={href} className="pane" style={jewelStyle(person.hue)} aria-label={`${pane.roleName}: ${mine ? "you" : person.name}`}>
      <span className="pane-foot">
        <span className="pane-role">{pane.roleName}</span>
        {mine ? <span className="pane-you">You</span> : null}
      </span>
      <span className="pane-name">{firstName(person.name)}</span>
    </Link>
  );
}

function OpenPane({ pane, children }: { pane: PaneData; children?: ReactNode }) {
  return (
    <div role="listitem" className={`pane ${pane.required ? "open" : "optional"}`}>
      <span className="pane-role">
        {pane.roleName}
        {pane.required ? "" : " · optional"}
      </span>
      <span className="pane-name">{pane.required ? "Needs someone" : "Nobody yet"}</span>
      {children ? <span className="pane-foot">{children}</span> : null}
    </div>
  );
}

/** Save keys shared by every control that takes or frees a role, so they all change together. */
export const takeKey = (meetingId: number, roleId: number) => `take:${meetingId}:${roleId}`;
export const dropKey = (meetingId: number, roleId: number) => `drop:${meetingId}:${roleId}`;

/**
 * The roster for one Friday, drawn as a leaded window. Filled slots are panes in the person's colour.
 * Given `meetingId` and `me`, a pane fills with you the moment you take it and empties the moment you drop it.
 */
export function Window({
  panes,
  meId,
  href,
  openAction,
  label,
  meetingId,
  me,
}: {
  panes: PaneData[];
  meId: number | null;
  href: (roleId: number) => string;
  openAction?: (pane: PaneData) => ReactNode;
  label: string;
  meetingId?: number;
  me?: Who;
}) {
  return (
    <div className="window" style={{ "--n": panes.length } as CSSProperties} role="list" aria-label={label}>
      {panes.map((p) => {
        if (p.person && !p.suggested) {
          const filled = <FilledPane pane={p} person={p.person} mine={p.person.id === meId} href={href(p.roleId)} />;
          if (meetingId === undefined) return <Fragment key={p.roleId}>{filled}</Fragment>;
          return (
            <Pending key={p.roleId} on={dropKey(meetingId, p.roleId)} show={<OpenPane pane={p} />}>
              {filled}
            </Pending>
          );
        }
        const open = <OpenPane pane={p}>{openAction?.(p)}</OpenPane>;
        if (meetingId === undefined || !me) return <Fragment key={p.roleId}>{open}</Fragment>;
        return (
          <Pending key={p.roleId} on={takeKey(meetingId, p.roleId)} show={<FilledPane pane={p} person={me} mine href={href(p.roleId)} />}>
            {open}
          </Pending>
        );
      })}
    </div>
  );
}

/** A tiny window for list rows: one pane per role. */
export function MiniPanes({ panes }: { panes: PaneData[] }) {
  return (
    <span className="mini-panes" aria-hidden>
      {panes.map((p) => (
        <i key={p.roleId} style={p.person && !p.suggested ? jewelStyle(p.person.hue) : undefined} />
      ))}
    </span>
  );
}

export function openCount(panes: PaneData[]) {
  return panes.filter((p) => p.required && (!p.person || p.suggested)).length;
}

export function StatusPill({ panes }: { panes: PaneData[] }) {
  const open = openCount(panes);
  if (open === 0) return <span className="pill done">All filled</span>;
  return <span className="pill open">{open} open</span>;
}

export function Hidden({ values }: { values: Record<string, string | number> }) {
  return (
    <>
      {Object.entries(values).map(([k, v]) => (
        <input key={k} type="hidden" name={k} value={v} />
      ))}
    </>
  );
}
