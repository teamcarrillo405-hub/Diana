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

  it("renders community confidence without fabricating people or outcomes", () => {
    const html = renderToStaticMarkup(
      <UpgradeScreen view="community" billingEnabled={false} />,
    );

    expect(html).toContain("STUDY WITH YOUR TEAM");
    expect(html).toContain("Membership-scoped");
    expect(html).toContain("Private by default");
    expect(html).toContain('aria-label="Review access options"');
    expect(html).toContain('href="/settings"');
    expect(html).not.toContain("10,000+");
    expect(html).not.toContain("Marcus T.");
    expect(html).not.toContain("Stanford");
    expect(html).not.toContain("98%");
    expect(html).not.toContain("$9.99");
  });
});
