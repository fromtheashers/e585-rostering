import "server-only";
import { cache } from "react";
import { firstGroup } from "@/lib/data";

/** The group, looked up once per request however many public components ask for it. */
export const publicGroup = cache(firstGroup);
