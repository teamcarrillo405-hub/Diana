"use client";

import { useState, type FormEvent } from "react";
import { ArrowRight } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { landingAnalyticsEvents, trackLandingEvent } from "./analytics";

type FormStatus = "idle" | "loading" | "success" | "error";

export function EarlyAccessForm({ className = "" }: { className?: string }) {
  const [email, setEmail] = useState("");
  const [website, setWebsite] = useState("");
  const [status, setStatus] = useState<FormStatus>("idle");
  const [message, setMessage] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) {
      setStatus("error");
      setMessage("Enter a valid email address to join early access.");
      return;
    }

    setStatus("loading");
    setMessage("");
    trackLandingEvent(landingAnalyticsEvents.waitlistStarted, { location: "final" });

    try {
      const supabase = createClient();
      const { error } = await supabase.functions.invoke("early-access-signup", {
        body: { email: email.trim(), website, source: "public_landing" },
      });
      if (error) throw error;
      setStatus("success");
      setMessage("Check your inbox to confirm your spot. If no email arrives, try again later.");
      trackLandingEvent(landingAnalyticsEvents.waitlistSubmitted, { location: "final" });
    } catch {
      setStatus("error");
      setMessage("We could not save your place yet. Please try again in a moment.");
      trackLandingEvent(landingAnalyticsEvents.waitlistFailed, { location: "final" });
    }
  }

  const disabled = status === "loading" || status === "success";
  return (
    <form className={`dpl-waitlist-form ${className}`.trim()} onSubmit={submit} noValidate>
      <label htmlFor="early-access-email">Email address</label>
      <div className="dpl-waitlist-row">
        <input
          id="early-access-email"
          name="email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="you@example.com"
          aria-describedby="early-access-message"
          aria-invalid={status === "error"}
          disabled={disabled}
          required
        />
        <button type="submit" disabled={disabled}>
          {status === "loading" ? "Joining..." : status === "success" ? "Check Your Email" : "Join the Waitlist"}
          {status !== "success" && <ArrowRight size={18} strokeWidth={2.25} aria-hidden="true" />}
        </button>
      </div>
      <label className="dpl-honeypot" htmlFor="early-access-website" aria-hidden="true">
        Website
        <input id="early-access-website" name="website" tabIndex={-1} autoComplete="off" value={website} onChange={(event) => setWebsite(event.target.value)} />
      </label>
      <p id="early-access-message" className={`dpl-form-message dpl-form-message-${status}`} aria-live="polite" role="status">
        {message || "One email. Your invite arrives when early access opens."}
      </p>
    </form>
  );
}
