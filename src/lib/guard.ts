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

/** Organiser screens: for the owner and admins, who are already signed in with their own PIN. */
export async function organiserContext(token: string, path: string): Promise<Ctx & { me: Person }> {
  const ctx = await memberContext(token, path);
  if (!ctx.organiser) redirect(`/g/${token}/more`);
  return ctx;
}

