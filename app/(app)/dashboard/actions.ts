"use server";

import { cookies } from "next/headers";
import { z } from "zod";

const ClassIdInput = z.string().uuid();

/**
 * Phase 8 — Scorer interleaving. Set the cookie that drives the next render's
 * de-promotion of the same-class top task. Called fire-and-forget from the
 * dashboard server component after the top assignment is identified.
 *
 * Cookie: diana_last_class
 * - HttpOnly: false (no XSS-sensitive data; just a class id)
 * - SameSite: lax (default behavior; the cookie is only read on same-origin GET)
 * - Path: /
 * - Max-Age: 12 hours — bounded so cross-session reset is natural
 */
export async function setLastShownClass(classId: string): Promise<void> {
  const parsed = ClassIdInput.safeParse(classId);
  if (!parsed.success) return;
  const c = await cookies();
  c.set("diana_last_class", parsed.data, {
    httpOnly: false,
    sameSite: "lax",
    path: "/",
    maxAge: 12 * 60 * 60,
  });
}
