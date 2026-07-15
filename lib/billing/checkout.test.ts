import { describe, expect, it } from "vitest";

import { resolveBillingCheckoutUrl } from "./checkout";

describe("resolveBillingCheckoutUrl", () => {
  it("requires the server-side enable switch", () => {
    expect(resolveBillingCheckoutUrl({
      BILLING_CHECKOUT_URL: "https://billing.example.test/session",
    })).toBeNull();
  });

  it("accepts only an enabled HTTPS checkout URL", () => {
    expect(resolveBillingCheckoutUrl({
      BILLING_CHECKOUT_ENABLED: "true",
      BILLING_CHECKOUT_URL: "https://billing.example.test/session",
    })?.hostname).toBe("billing.example.test");
    expect(resolveBillingCheckoutUrl({
      BILLING_CHECKOUT_ENABLED: "true",
      BILLING_CHECKOUT_URL: "http://billing.example.test/session",
    })).toBeNull();
  });

  it("rejects malformed checkout URLs", () => {
    expect(resolveBillingCheckoutUrl({
      BILLING_CHECKOUT_ENABLED: "true",
      BILLING_CHECKOUT_URL: "not-a-url",
    })).toBeNull();
  });
});
