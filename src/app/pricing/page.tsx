import { PricingGrid } from "@/components/billing/pricing-grid";
import { PublicDocument } from "@/components/public/public-shell";
import { getRuntimeEnvironment } from "@/lib/env";

export default async function PricingPage({
  searchParams,
}: {
  searchParams: Promise<{ interval?: string }>;
}) {
  const query = await searchParams;
  const interval = query.interval === "year" ? "year" : "month";
  const environment = getRuntimeEnvironment();
  return (
    <PublicDocument
      eyebrow="Pricing"
      title="Plans that match controlled outreach"
      summary="Compare plan limits, then sign in to manage test-mode checkout and billing from your workspace."
    >
      <PricingGrid
        interval={interval}
        annualDiscountPercent={environment.ANNUAL_DISCOUNT_PERCENT}
      />
    </PublicDocument>
  );
}
