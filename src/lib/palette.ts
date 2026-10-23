/**
 * Each person keeps one jewel colour, like a pane of stained glass.
 * Every value holds white text above 4.5:1. Neighbouring indices sit far apart on the wheel,
 * so the first few people added never get look-alike colours.
 */
export const JEWELS = [
  { name: "Ruby", value: "#a3122f" },
  { name: "Cobalt", value: "#1f4fbf" },
  { name: "Emerald", value: "#0b7449" },
  { name: "Amethyst", value: "#6b3fa0" },
  { name: "Amber", value: "#9a5200" },
  { name: "Teal", value: "#0b6a72" },
  { name: "Rose", value: "#a8255f" },
  { name: "Olive", value: "#56661a" },
  { name: "Copper", value: "#9a3a17" },
  { name: "Slate", value: "#3b5577" },
] as const;

export function jewel(hue: number) {
  return JEWELS[((hue % JEWELS.length) + JEWELS.length) % JEWELS.length];
}

/** The next colour nobody active is using, or the least used one. */
export function nextHue(taken: number[]): number {
  const counts = JEWELS.map((_, i) => taken.filter((t) => t === i).length);
  const min = Math.min(...counts);
  return counts.indexOf(min);
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 1).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] ?? name;
}
