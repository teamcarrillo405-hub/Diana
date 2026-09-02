import { LockKeyhole } from "lucide-react";

import { AppMark } from "@/components/screen-design/app-mark";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main id="main-content" className="sd-auth-page">
      <div className="sd-auth-frame">
        <span className="sd-auth-frame-notch sd-auth-frame-notch--top" aria-hidden="true" />
        <span className="sd-auth-frame-notch sd-auth-frame-notch--bottom" aria-hidden="true" />
        <div className="sd-auth-brand"><AppMark href="/" /></div>
        <div className="sd-auth-shell">
          <section className="sd-auth-story">
            <div className="sd-auth-copy">
              <p className="sd-kicker"><LockKeyhole size={14} aria-hidden="true" /> Private student space</p>
              <h1 className="sd-title">Your day, ready when you are.</h1>
              <p className="sd-subtitle">
                Pick up your work, your sources, and the next step in one calm place.
              </p>
            </div>
          </section>

          <section className="sd-auth-card">
            {children}
          </section>
        </div>
      </div>
    </main>
  );
}
