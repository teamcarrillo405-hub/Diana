import { BookOpenCheck, LockKeyhole, Sparkles } from "lucide-react";

import { AppMark } from "@/components/screen-design/app-mark";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main id="main-content" className="sd-auth-page">
      <div className="sd-auth-shell">
        <section className="sd-auth-story">
          <AppMark href="/" />

          <div className="sd-auth-copy">
            <p className="sd-kicker"><LockKeyhole size={14} aria-hidden="true" /> Private student space</p>
            <h1 className="sd-title">Your next move is waiting.</h1>
            <p className="sd-subtitle">
              Come back to one clear next move, your class sources, and work that stays yours.
            </p>
          </div>

          <div className="sd-auth-preview" aria-label="Diana dashboard preview">
            <div className="sd-auth-coach">
              <span className="sd-brand-mark" aria-hidden="true">D</span>
              <div>
                <p className="sd-kicker">Coach Diana</p>
                <strong>Start small. I’ll keep the source and the next step together.</strong>
              </div>
            </div>
            <div className="sd-auth-preview-grid">
              <div><BookOpenCheck size={18} aria-hidden="true" /><strong>Classes</strong><span>Organized</span></div>
              <div><Sparkles size={18} aria-hidden="true" /><strong>Next move</strong><span>Ready</span></div>
              <div><LockKeyhole size={18} aria-hidden="true" /><strong>Your work</strong><span>Private</span></div>
            </div>
          </div>
        </section>

        <section className="sd-auth-card">
          {children}
        </section>
      </div>
    </main>
  );
}
