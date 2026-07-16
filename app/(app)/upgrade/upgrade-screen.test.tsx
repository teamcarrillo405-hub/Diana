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
});
