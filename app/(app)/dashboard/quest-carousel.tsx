"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

export type QuestItem = {
  n: number;
  subject: string;
  title: string;
  due: string;
  accent: string;
  href: string;
};

export function QuestCarousel({ quests }: { quests: QuestItem[] }) {
  const [qi, setQi] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  function startTimer() {
    timerRef.current = setInterval(() => {
      setQi((i) => (i + 1) % Math.max(1, quests.length));
    }, 5000);
  }

  useEffect(() => {
    if (quests.length > 1) startTimer();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quests.length]);

  function goTo(i: number) {
    if (timerRef.current) clearInterval(timerRef.current);
    setQi(i);
    if (quests.length > 1) startTimer();
  }

  if (quests.length === 0) return null;

  return (
    <div
      style={{
        position: "absolute",
        left: 34,
        bottom: 36,
        width: 460,
        zIndex: 8,
      }}
    >
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
        <div
          style={{
            fontFamily: "var(--font-saira-condensed), 'Saira Condensed', sans-serif",
            fontWeight: 800,
            fontStyle: "italic",
            fontSize: 22,
            letterSpacing: ".04em",
            textTransform: "uppercase",
            color: "#fff",
          }}
        >
          Quest Path
        </div>
        <div
          style={{
            flex: 1,
            height: 1,
            background: "linear-gradient(90deg,rgba(120,150,220,.4),transparent)",
          }}
        />
        <button
          onClick={() => goTo((qi - 1 + quests.length) % quests.length)}
          aria-label="Previous quest"
          style={{
            width: 28,
            height: 28,
            borderRadius: 7,
            background: "rgba(120,150,220,.14)",
            border: "none",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            color: "#cdd6f2",
            fontSize: 16,
          }}
        >
          ‹
        </button>
        <button
          onClick={() => goTo((qi + 1) % quests.length)}
          aria-label="Next quest"
          style={{
            width: 28,
            height: 28,
            borderRadius: 7,
            background: "rgba(120,150,220,.14)",
            border: "none",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            color: "#cdd6f2",
            fontSize: 16,
          }}
        >
          ›
        </button>
      </div>

      {/* Card viewport */}
      <div style={{ overflow: "hidden", width: 460, borderRadius: 12 }}>
        <div
          style={{
            display: "flex",
            gap: 0,
            transition: "transform .5s cubic-bezier(.22,.61,.36,1)",
            transform: `translateX(${-qi * 460}px)`,
          }}
        >
          {quests.map((q, i) => (
            <Link
              key={i}
              href={q.href}
              style={{
                flex: "0 0 460px",
                width: 460,
                height: 130,
                padding: "16px 22px",
                background: "linear-gradient(135deg,rgba(18,26,52,.96),rgba(10,16,36,.96))",
                border: "1px solid rgba(120,150,220,.2)",
                boxShadow: "0 10px 30px rgba(0,0,0,.5)",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                textDecoration: "none",
                color: "#fff",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div
                    style={{
                      width: 26,
                      height: 26,
                      borderRadius: 7,
                      fontFamily: "var(--font-saira-condensed), 'Saira Condensed', sans-serif",
                      fontWeight: 800,
                      fontSize: 15,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#0a1024",
                      background: q.accent,
                      flexShrink: 0,
                    }}
                  >
                    {q.n}
                  </div>
                  <div
                    style={{
                      fontWeight: 700,
                      fontSize: 11,
                      letterSpacing: ".12em",
                      textTransform: "uppercase",
                      color: q.accent,
                    }}
                  >
                    {q.subject}
                  </div>
                </div>
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    letterSpacing: ".06em",
                    padding: "4px 9px",
                    borderRadius: 5,
                    background: "rgba(120,150,220,.14)",
                    color: "#aab8e0",
                    flexShrink: 0,
                  }}
                >
                  {q.due}
                </div>
              </div>
              <div
                style={{
                  fontFamily: "var(--font-saira-condensed), 'Saira Condensed', sans-serif",
                  fontWeight: 700,
                  fontSize: 24,
                  lineHeight: 1.05,
                }}
              >
                {q.title}
              </div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  fontSize: 12,
                  fontWeight: 600,
                  color: "#7d88ad",
                }}
              >
                <span>
                  Step {q.n} of {quests.length}
                </span>
                <span style={{ color: "#cdd6f2" }}>Open →</span>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Dot indicators */}
      <div style={{ display: "flex", gap: 7, justifyContent: "center", marginTop: 10 }}>
        {quests.map((_, i) => (
          <button
            key={i}
            onClick={() => goTo(i)}
            aria-label={`Quest ${i + 1}`}
            style={{
              height: 5,
              borderRadius: 3,
              border: "none",
              cursor: "pointer",
              transition: "all .35s",
              width: i === qi ? 20 : 6,
              background: i === qi ? "#29d0ff" : "rgba(120,150,220,.28)",
              padding: 0,
            }}
          />
        ))}
      </div>
    </div>
  );
}
