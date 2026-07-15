type BillingEnvironment = {
  [key: string]: string | undefined;
  BILLING_CHECKOUT_ENABLED?: string;
  BILLING_CHECKOUT_URL?: string;
};

export function resolveBillingCheckoutUrl(
  environment: BillingEnvironment = process.env,
): URL | null {
  if (environment.BILLING_CHECKOUT_ENABLED !== "true") return null;

  const rawUrl = environment.BILLING_CHECKOUT_URL;
  if (!rawUrl) return null;

  try {
    const url = new URL(rawUrl);
    return url.protocol === "https:" ? url : null;
  } catch {
    return null;
  }
}
