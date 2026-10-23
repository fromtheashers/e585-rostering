import "server-only";
import { redirect } from "next/navigation";
import type { Person } from "@/db/schema";
import { context, type Ctx } from "./data";

/** Pages that need to know who you are send you to "Who are you?" first, then back. */
export async function memberContext(token: string, path: string): Promise<Ctx & { me: Person }> {
  const ctx = await context(token);
  if (!ctx.me) redirect(`/g/${token}/who?next=${encodeURIComponent(`/g/${token}${path}`)}`);
  return ctx as Ctx & { me: Person };
}

export async function organiserContext(token: string, path: string) {
  const ctx = await context(token);
  if (!ctx.organiser) redirect(`/g/${token}/organiser/unlock?next=${encodeURIComponent(`/g/${token}${path}`)}`);
  return ctx;
}

/** Pages an organiser can use before picking their own name (the calendar). */
export async function memberOrOrganiserContext(token: string, path: string) {
  const ctx = await context(token);
  if (!ctx.me && !ctx.organiser) redirect(`/g/${token}/who?next=${encodeURIComponent(`/g/${token}${path}`)}`);
  return ctx;
}
