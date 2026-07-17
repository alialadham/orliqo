import { PublicDocument } from "@/components/public/public-shell";

export default function PricingPage() {
  return <PublicDocument eyebrow="Pricing" title="Plans that match controlled outreach" summary="Billing is intentionally kept in Stripe test mode until provider credentials and explicit production approval are supplied."><section><h2>Starter, Growth, and Agency</h2><p>The database includes versioned plan entitlements and usage counters. Checkout, exact published prices, upgrades, and customer portal behavior are implemented in Phase 6 and will not be represented as live before Stripe test validation.</p></section><section><h2>Demo access</h2><p>The Phase 1 demo workspace is free to explore, uses synthetic records, and cannot send email or WhatsApp messages.</p></section></PublicDocument>;
}
