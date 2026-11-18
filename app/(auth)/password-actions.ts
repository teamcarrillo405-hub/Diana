"use server";

import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { resolvePublicSiteUrl } from "@/lib/public-site-url";
import { passwordValidation, safeAuthDestination, validRecoveryEmail } from "@/lib/auth/entry";
import { RECOVERY_COOKIE, recoveryCookieOptions, recoveryStateSecret, verifyRecoveryState } from "@/lib/auth/recovery-state";
export type PasswordActionResult = {
  ok: boolean;
  message: string;
  next?: string;
};
const SENT = "If an account matches this email, a reset link will arrive shortly. Check your spam folder too.";
export async function requestPasswordReset(email: string, next?: string): Promise<PasswordActionResult> {
  if (!validRecoveryEmail(email)) return {
    ok: false,
    message: "Enter a valid email address."
  };
  if (!recoveryStateSecret()) return {
    ok: false,
    message: "Password recovery is not available yet. Try again later."
  };
  const target = new URL("/auth/callback", resolvePublicSiteUrl());
  target.searchParams.set("next", "/reset-password");
  target.searchParams.set("return_to", safeAuthDestination(next));
  try {
    const supabase = await createClient();
    // Return the same result for account/provider responses. Do not reveal which emails exist.
    await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
      redirectTo: target.toString()
    });
    return {
      ok: true,
      message: SENT
    };
  } catch {
    return {
      ok: false,
      message: "The connection paused. Try requesting the link again."
    };
  }
}
async function resetSession() {
  const key = recoveryStateSecret();
  if (!key) return null;
  const supabase = await createClient();
  const {
    data: {
      user
    },
    error
  } = await supabase.auth.getUser();
  if (error || !user || !user.updated_at) return null;
  const {
    data: {
      session
    },
    error: sessionError
  } = await supabase.auth.getSession();
  if (sessionError || !session) return null;
  const store = await cookies();
  const proof = verifyRecoveryState({
    value: store.get(RECOVERY_COOKIE)?.value,
    userId: user.id,
    userRevision: user.updated_at,
    accessToken: session.access_token,
    secret: key
  });
  return proof ? {
    supabase,
    store,
    next: proof.next
  } : null;
}
export async function getPasswordResetContext(): Promise<{
  available: boolean;
  next?: string;
}> {
  try {
    const value = await resetSession();
    return value ? {
      available: true,
      next: value.next
    } : {
      available: false
    };
  } catch {
    return {
      available: false
    };
  }
}
export async function completePasswordReset(password: string, confirmation: string): Promise<PasswordActionResult> {
  const validation = passwordValidation(password, confirmation);
  if (validation) return {
    ok: false,
    message: validation
  };
  try {
    const context = await resetSession();
    if (!context) return {
      ok: false,
      message: "This reset link is no longer available. Request a new link."
    };
    const {
      error
    } = await context.supabase.auth.updateUser({
      password
    });
    if (error) return {
      ok: false,
      message: "Your password could not be saved. Choose a different password or request a new link."
    };
    context.store.set(RECOVERY_COOKIE, "", {
      ...recoveryCookieOptions(),
      maxAge: 0
    });
    return {
      ok: true,
      message: "Your password is saved. Use it the next time you sign in.",
      next: context.next
    };
  } catch {
    return {
      ok: false,
      message: "The connection paused. Your password change could not be confirmed. Try again."
    };
  }
}
export async function changeAccountPassword(currentPassword: string, password: string, confirmation: string): Promise<PasswordActionResult> {
  const validation = passwordValidation(password, confirmation);
  if (validation) return {
    ok: false,
    message: validation
  };
  if (typeof currentPassword !== "string" || !currentPassword || currentPassword.length > 256) return {
    ok: false,
    message: "Enter your current password."
  };
  try {
    const supabase = await createClient();
    const {
      data: {
        user
      },
      error: userError
    } = await supabase.auth.getUser();
    if (userError || !user?.email) return {
      ok: false,
      message: "Sign in again before changing your password."
    };
    const {
      data,
      error: reauthError
    } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: currentPassword
    });
    if (reauthError || data.user?.id !== user.id) return {
      ok: false,
      message: "Your current password could not be confirmed. Try again or use account recovery."
    };
    const {
      error
    } = await supabase.auth.updateUser({
      password
    });
    if (error) return {
      ok: false,
      message: "Your password could not be saved. Choose a different new password and try again."
    };
    return {
      ok: true,
      message: "Your password is saved. Use it the next time you sign in."
    };
  } catch {
    return {
      ok: false,
      message: "The connection paused. Your password change could not be confirmed. Try again."
    };
  }
}
