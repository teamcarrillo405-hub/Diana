"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { usePathname } from "next/navigation";
import { requestAgentCoach } from "@/app/(app)/agent-fab-actions";
import { ownsScreenDesignNavigation } from "@/lib/navigation";

const SF = "var(--font-saira-condensed), 'Saira Condensed', sans-serif";
const BF = "var(--font-barlow), 'Barlow Semi Condensed', sans-serif";

type ChatMessage = { role: "student" | "coach"; content: string };

const OPENING_MESSAGE =
  "Hey, what do you need? I can explain anything on this page, or point you at what to do next. If it's homework, everything happens in Work.";

const QUICK_CHIPS = [
  "What should I do next?",
  "Explain this page",
  "I'm feeling stuck",
];

const PAGE_LABELS: Record<string, string> = {
  "/dashboard": "Today",
  "/assignments": "Work",
  "/classes": "Classes",
  "/calendar": "Calendar",
  "/messages": "Messages",
  "/settings": "Settings",
  "/notes": "Notes",
  "/flashcards": "Flashcards",
  "/proof": "Proof",
  "/future-path": "Future",
};

function pageLabelFor(pathname: string): string {
  if (PAGE_LABELS[pathname]) return PAGE_LABELS[pathname];
  const base = "/" + (pathname.split("/")[1] ?? "");
  return PAGE_LABELS[base] ?? "";
}

// Lets screen-specific components open the one global coaching drawer.
const OPEN_EVENT = "diana:open-agent-fab";
export function openAgentFab() {
  window.dispatchEvent(new Event(OPEN_EVENT));
}

export function AgentFab() {
  const pathname = usePathname() ?? "/";
  const [open, setOpen] = useState(false);
  const [hover, setHover] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([{ role: "coach", content: OPENING_MESSAGE }]);
  const [draft, setDraft] = useState("");
  const [typing, setTyping] = useState(false);
  const [pending, startTransition] = useTransition();
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [messages, typing]);

  useEffect(() => {
    const onOpen = () => setOpen(true);
    window.addEventListener(OPEN_EVENT, onOpen);
    return () => window.removeEventListener(OPEN_EVENT, onOpen);
  }, []);

  const bottomOffset = ownsScreenDesignNavigation(pathname) ? 26 : 96;

  function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || pending) return;
    const history = messages.slice(-8);
    setMessages((m) => [...m, { role: "student", content: trimmed }]);
    setDraft("");
    setTyping(true);
    startTransition(async () => {
      const result = await requestAgentCoach({
        message: trimmed,
        pageLabel: pageLabelFor(pathname),
        history,
      });
      setTyping(false);
      setMessages((m) => [
        ...m,
        { role: "coach", content: result.ok ? result.content : result.error },
      ]);
    });
  }

  return (
    <div style={{ fontFamily: BF }}>
      <style>{`
        @keyframes af-pulse{0%,100%{box-shadow:0 0 0 0 rgba(41,208,255,.45),0 8px 26px rgba(0,0,0,.5)}50%{box-shadow:0 0 0 8px rgba(41,208,255,0),0 8px 26px rgba(0,0,0,.5)}}
        @keyframes af-in{from{opacity:0;transform:translateY(8px) scale(.9)}to{opacity:1;transform:none}}
        @keyframes af-dot{0%,80%,100%{opacity:.25}40%{opacity:1}}
        @media (max-width: 900px) {
          .agent-fab-anchor {
            right: 16px !important;
            bottom: calc(5rem + env(safe-area-inset-bottom) + 12px) !important;
          }
        }
      `}</style>

      {!open && (
        <div className="agent-fab-anchor" style={{ position: "fixed", right: 26, bottom: bottomOffset, zIndex: 999, display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 10 }}>
          {hover && (
            <div style={{ animation: "af-in .35s ease both", padding: "9px 14px", borderRadius: 11, background: "rgba(6,10,24,.92)", border: "1px solid rgba(41,208,255,.3)", backdropFilter: "blur(10px)", boxShadow: "0 10px 26px rgba(0,0,0,.45)", fontSize: 13, fontWeight: 600, color: "#eaf6ff", whiteSpace: "nowrap" }}>
              Ask Diana a question
            </div>
          )}
          <button
            type="button"
            onClick={() => {
              setOpen(true);
              setHover(false);
            }}
            onMouseEnter={() => setHover(true)}
            onMouseLeave={() => setHover(false)}
            title="Ask Diana"
            style={{
              width: 64,
              height: 64,
              borderRadius: "50%",
              cursor: "pointer",
              position: "relative",
              background: "radial-gradient(circle at 32% 28%,#151d34,#060911 70%)",
              border: "1.5px solid rgba(41,208,255,.4)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              animation: "af-pulse 2.6s ease-in-out infinite",
              padding: 0,
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/agent-robot-bust.png"
              alt="Diana AI agent"
              style={{ width: 46, height: 46, objectFit: "cover", objectPosition: "50% 15%", borderRadius: "50%", filter: "drop-shadow(0 0 6px rgba(41,208,255,.5))" }}
            />
            <span aria-hidden="true" style={{ position: "absolute", right: 2, bottom: 2, width: 14, height: 14, borderRadius: "50%", background: "#36e07a", border: "2px solid #04060f" }} />
          </button>
        </div>
      )}

      {open && (
        <div style={{ position: "fixed", top: 0, right: 0, bottom: 0, zIndex: 999, width: 390, maxWidth: "92vw", display: "flex", flexDirection: "column", background: "linear-gradient(180deg,rgba(8,12,26,.97),rgba(12,18,42,.97))", borderLeft: "1px solid rgba(41,208,255,.25)", boxShadow: "-30px 0 70px rgba(0,0,0,.55)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 11, padding: "16px 18px", borderBottom: "1px solid rgba(120,150,220,.18)" }}>
            <div style={{ width: 38, height: 38, borderRadius: "50%", background: "rgba(41,208,255,.14)", border: "1px solid rgba(41,208,255,.25)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, overflow: "hidden" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/agent-robot-bust.png" alt="Diana AI agent" style={{ width: 34, height: 34, objectFit: "cover", objectPosition: "50% 15%", borderRadius: "50%", filter: "drop-shadow(0 0 5px rgba(41,208,255,.5))" }} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontFamily: SF, fontWeight: 800, fontSize: 15, letterSpacing: ".06em", textTransform: "uppercase", color: "#fff" }}>Diana</div>
              <div style={{ fontSize: 11.5, color: "#7d88ad" }}>Coach, not answers</div>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close"
              style={{ width: 32, height: 32, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", border: "1px solid rgba(120,150,220,.18)", background: "transparent" }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#aab8e0" strokeWidth="2.4" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12" /></svg>
            </button>
          </div>

          <div ref={listRef} style={{ flex: 1, overflowY: "auto", padding: "16px 18px", display: "flex", flexDirection: "column", gap: 10 }}>
            {messages.map((m, i) =>
              m.role === "coach" ? (
                <div key={i} style={{ alignSelf: "flex-start", maxWidth: "92%", borderRadius: "12px 12px 12px 4px", border: "1px solid rgba(41,208,255,.18)", background: "rgba(41,208,255,.08)", padding: "10px 13px", fontSize: 14, lineHeight: 1.55, color: "#cdd6f2" }}>
                  {m.content}
                </div>
              ) : (
                <div key={i} style={{ alignSelf: "flex-end", maxWidth: "88%", borderRadius: "12px 12px 4px 12px", background: "rgba(120,150,220,.14)", padding: "10px 13px", fontSize: 14, lineHeight: 1.5, color: "#fff" }}>
                  {m.content}
                </div>
              ),
            )}
            {typing && (
              <div style={{ alignSelf: "flex-start", display: "flex", gap: 4, borderRadius: "12px 12px 12px 4px", border: "1px solid rgba(41,208,255,.18)", background: "rgba(41,208,255,.08)", padding: "12px 14px" }}>
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#29d0ff", animation: "af-dot 1.2s infinite" }} />
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#29d0ff", animation: "af-dot 1.2s .2s infinite" }} />
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#29d0ff", animation: "af-dot 1.2s .4s infinite" }} />
              </div>
            )}
          </div>

          <div style={{ padding: "12px 16px", borderTop: "1px solid rgba(120,150,220,.18)" }}>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
              {QUICK_CHIPS.map((chip) => (
                <button
                  key={chip}
                  type="button"
                  onClick={() => send(chip)}
                  disabled={pending}
                  style={{ padding: "6px 12px", borderRadius: 15, border: "1px solid rgba(41,208,255,.25)", background: "rgba(41,208,255,.08)", cursor: "pointer", fontSize: 12.5, fontWeight: 600, color: "#cdd6f2" }}
                >
                  {chip}
                </button>
              ))}
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") send(draft);
                }}
                placeholder="Ask Diana anything…"
                disabled={pending}
                style={{ flex: 1, padding: "11px 13px", borderRadius: 10, border: "1px solid rgba(120,150,220,.18)", background: "rgba(10,16,36,.8)", color: "#e8f0ff", fontFamily: BF, fontSize: 14, boxSizing: "border-box" }}
              />
              <button
                type="button"
                onClick={() => send(draft)}
                disabled={pending}
                aria-label="Send"
                style={{ width: 42, height: 42, borderRadius: 10, background: "#29d0ff", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0, border: "none", opacity: pending ? 0.6 : 1 }}
              >
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#04080f" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4z" /></svg>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
