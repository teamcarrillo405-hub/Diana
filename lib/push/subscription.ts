import { isIP } from "node:net";

import {
  assertPublicIpAddress,
  parseHttpsUrl,
  validateOutboundUrl,
  type OutboundUrlPolicy,
} from "@/lib/security/outbound-url";

export const MAX_PUSH_SUBSCRIPTIONS_PER_OWNER = 10;

export function isAllowedPushEndpoint(value: string): boolean {
  if (value.length > 2_048) return false;

  try {
    const url = parseHttpsUrl(value);
    const host = url.hostname.toLowerCase().replace(/^\[|\]$/gu, "");
    if (host.endsWith(".local")) return false;
    if (isIP(host)) {
      assertPublicIpAddress(host);
      return true;
    }
    return host.includes(".") && !host.endsWith(".");
  } catch {
    return false;
  }
}

export async function validatePushEndpoint(
  value: string,
  policy: OutboundUrlPolicy = {},
): Promise<boolean> {
  if (!isAllowedPushEndpoint(value)) return false;
  try {
    await validateOutboundUrl(value, policy);
    return true;
  } catch {
    return false;
  }
}
