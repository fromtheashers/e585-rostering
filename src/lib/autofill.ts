/**
 * Auto-fill: suggests a person for every empty role slot, meeting by meeting.
 * Pure function so the rules can be tested without a database.
 *
 * Rules, in order:
 * 1. Only people marked Yes for that Friday; Maybe only when nobody marked Yes fits.
 * 2. Never someone who said "Rather not" for the role.
 * 3. One role per person per meeting, except pairs the organiser allows.
 * 4. Respect each person's "at most N times a month".
 * 5. Whoever has served the fewest times recently, with Love counting as one time fewer,
 *    so keen people are picked a bit more often without taking every Friday.
 * 6. Required roles first; optional roles (Games) only if someone suitable is left.
 * Someone who offered for that exact role on that Friday comes first (unless away that day),
 * even over a "Rather not", since the offer is the more recent and specific answer.
 * Existing assignments (sign-ups, organiser picks, earlier suggestions) are never touched.
 */

export type Avail = "yes" | "maybe" | "no";
export type Level = "love" | "happy" | "rather_not";

export interface AutofillInput {
  meetings: { id: number; date: string }[];
  roles: { id: number; required: boolean; sortOrder: number }[];
  people: { id: number; maxPerMonth: number | null; defaultAvailability: Avail }[];
  availability: Map<string, Avail>; // `${personId}:${meetingId}`
  preferences: Map<string, Level>; // `${personId}:${roleId}`
  existing: { meetingId: number; roleId: number; personId: number; date: string }[];
  /** Times each person served in the weeks before the first meeting being filled. */
  recentCounts: Map<number, number>;
  allowedPairs: [number, number][];
  /** `${personId}:${meetingId}:${roleId}` for each offer made on a Friday. */
  offers?: Set<string>;
}

export interface Suggestion {
  meetingId: number;
  roleId: number;
  personId: number;
}

export function availabilityFor(input: Pick<AutofillInput, "availability" | "people">, personId: number, meetingId: number): Avail {
  return (
    input.availability.get(`${personId}:${meetingId}`) ??
    input.people.find((p) => p.id === personId)?.defaultAvailability ??
    "yes"
  );
}

export function pairAllowed(pairs: [number, number][], a: number, b: number): boolean {
  return pairs.some(([x, y]) => (x === a && y === b) || (x === b && y === a));
}

export function autofill(input: AutofillInput): Suggestion[] {
  const suggestions: Suggestion[] = [];
  const held = [...input.existing];
  const totals = new Map(input.recentCounts);
  for (const h of input.existing) totals.set(h.personId, (totals.get(h.personId) ?? 0) + 1);

  const roleOrder = [...input.roles].sort(
    (a, b) => Number(b.required) - Number(a.required) || a.sortOrder - b.sortOrder || a.id - b.id,
  );
  const meetingsInOrder = [...input.meetings].sort((a, b) => a.date.localeCompare(b.date));

  for (const meeting of meetingsInOrder) {
    const month = meeting.date.slice(0, 7);
    for (const role of roleOrder) {
      if (held.some((h) => h.meetingId === meeting.id && h.roleId === role.id)) continue;

      const offered = (personId: number) => input.offers?.has(`${personId}:${meeting.id}:${role.id}`) ?? false;
      const fits = (personId: number) => {
        if (input.preferences.get(`${personId}:${role.id}`) === "rather_not" && !offered(personId)) return false;
        const rolesHere = held.filter((h) => h.meetingId === meeting.id && h.personId === personId);
        if (rolesHere.some((h) => !pairAllowed(input.allowedPairs, h.roleId, role.id))) return false;
        const cap = input.people.find((p) => p.id === personId)?.maxPerMonth;
        if (cap != null) {
          const thisMonth = held.filter((h) => h.personId === personId && h.date.slice(0, 7) === month).length;
          if (thisMonth >= cap) return false;
        }
        return true;
      };

      const rank = (personId: number) => {
        const love = input.preferences.get(`${personId}:${role.id}`) === "love" ? 1 : 0;
        return [(totals.get(personId) ?? 0) - love, -love, personId];
      };
      const best = (ids: number[]) =>
        ids.sort((a, b) => {
          const ra = rank(a);
          const rb = rank(b);
          return ra[0] - rb[0] || ra[1] - rb[1] || ra[2] - rb[2];
        })[0];

      const pool = (status: Avail) =>
        input.people.map((p) => p.id).filter((id) => availabilityFor(input, id, meeting.id) === status && fits(id));

      const offers = [...pool("yes"), ...pool("maybe")].filter(offered);
      const chosen = best(offers) ?? best(pool("yes")) ?? best(pool("maybe"));
      if (chosen === undefined) continue;

      suggestions.push({ meetingId: meeting.id, roleId: role.id, personId: chosen });
      held.push({ meetingId: meeting.id, roleId: role.id, personId: chosen, date: meeting.date });
      totals.set(chosen, (totals.get(chosen) ?? 0) + 1);
    }
  }
  return suggestions;
}
