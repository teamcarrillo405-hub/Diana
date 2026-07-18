"use client";

import { ChevronLeft, ChevronRight, Monitor, Smartphone } from "lucide-react";
import { useState } from "react";

export interface ResponsiveProofScreen {
  readonly id: string;
  readonly label: string;
}

export function ResponsiveProofGallery({
  screens,
}: {
  screens: readonly ResponsiveProofScreen[];
}) {
  const [index, setIndex] = useState(0);
  const selected = screens[index] ?? screens[0];

  if (!selected) return null;

  const move = (amount: number) => {
    setIndex((current) => (current + amount + screens.length) % screens.length);
  };

  return (
    <main className="sd-responsive-proof" id="main-content">
      <header className="sd-responsive-proof-header">
        <div>
          <p>Diana responsive proof</p>
          <h1>Mobile and desktop, together</h1>
          <span>
            Review the same synthetic screen in both approved formats before final design sign-off.
          </span>
        </div>
        <strong>{index + 1} / {screens.length}</strong>
      </header>

      <nav className="sd-responsive-proof-controls" aria-label="Responsive proof screens">
        <button type="button" onClick={() => move(-1)} aria-label="Previous screen">
          <ChevronLeft aria-hidden="true" />
        </button>
        <label>
          <span>Screen</span>
          <select
            value={selected.id}
            onChange={(event) => {
              const next = screens.findIndex((screen) => screen.id === event.target.value);
              if (next >= 0) setIndex(next);
            }}
          >
            {screens.map((screen) => (
              <option key={screen.id} value={screen.id}>{screen.label}</option>
            ))}
          </select>
        </label>
        <button type="button" onClick={() => move(1)} aria-label="Next screen">
          <ChevronRight aria-hidden="true" />
        </button>
      </nav>

      <section className="sd-responsive-proof-stage" aria-live="polite">
        <figure className="sd-responsive-proof-device" data-device="mobile">
          <figcaption>
            <span><Smartphone aria-hidden="true" /> Mobile</span>
            <small>393 x 852</small>
          </figcaption>
          <div className="sd-responsive-proof-mobile-frame">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`/screendesign-proof/mobile/${selected.id}.webp`}
              alt={`${selected.label} mobile proof`}
              width={393}
              height={852}
            />
          </div>
        </figure>

        <figure className="sd-responsive-proof-device" data-device="desktop">
          <figcaption>
            <span><Monitor aria-hidden="true" /> Desktop</span>
            <small>1440 x 1000</small>
          </figcaption>
          <div className="sd-responsive-proof-desktop-frame">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`/screendesign-proof/desktop/${selected.id}.webp`}
              alt={`${selected.label} desktop proof`}
              width={1440}
              height={1000}
            />
          </div>
        </figure>
      </section>
    </main>
  );
}
