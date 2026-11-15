import { NextRequest, NextResponse } from "next/server";

import { resolveBillingCheckoutUrl } from "@/lib/billing/checkout";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(new URL("/login", request.url));

  const checkoutUrl = resolveBillingCheckoutUrl();
  if (!checkoutUrl) return NextResponse.redirect(new URL("/upgrade?status=unavailable", request.url));

  await supabase.from("analytics_events").insert({
    owner_id: user.id,
    event_name: "billing_checkout_opened",
    feature: "billing",
    route: "/upgrade",
    metadata: {},
  });

  const userCheckoutUrl = new URL(checkoutUrl);
  userCheckoutUrl.searchParams.set("client_reference_id", user.id);
  return NextResponse.redirect(userCheckoutUrl);
}
