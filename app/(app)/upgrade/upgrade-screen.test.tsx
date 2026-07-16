import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { UpgradeScreen } from "./upgrade-screen";

describe("UpgradeScreen", () => {
  it("renders the canonical standard hierarchy without inventing checkout", () => {
    const html = renderToStaticMarkup(
      <UpgradeScreen view="standard" billingEnabled={false} />,
    );

    expect(html).toContain("GO FURTHER");
    expect(html).toContain("Learning tools");
    expect(html).toContain("Account controls");
    expect(html).toContain('href="/settings"');
    expect(html).toContain('aria-label="Review access options"');
    expect(html).not.toContain('href="/api/billing/checkout"');
    expect(html).not.toContain("92%");
    expect(html).not.toContain("START FREE TRIAL");
  });

  it("exposes the server checkout endpoint only for a configured capability", () => {
    const configured = renderToStaticMarkup(
      <UpgradeScreen view="standard" billingEnabled />,
    );
    const unavailable = renderToStaticMarkup(
      <UpgradeScreen
        view="standard"
        billingEnabled={false}
        billingUnavailable
      />,
    );

    expect(configured).toContain('href="/api/billing/checkout"');
    expect(configured).toContain("Continue to secure checkout");
    expect(configured).not.toContain("purchase complete");
    expect(unavailable).toContain("Secure checkout is not configured");
    expect(unavailable).toContain('href="/settings"');
    expect(unavailable).not.toContain('href="/api/billing/checkout"');
  });
});
