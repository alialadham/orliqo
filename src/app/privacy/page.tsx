import { PublicDocument } from "@/components/public/public-shell";

export default function PrivacyPage() {
  return <PublicDocument eyebrow="Legal draft" title="Privacy" summary="This development draft describes the safeguards implemented in the product. It requires legal review before production publication."><section><h2>Workspace data</h2><p>Orliqo separates workspace records with membership checks and row-level security. Provider credentials are server-only and are not exposed through client-readable tables.</p></section><section><h2>Demo data</h2><p>Demo mode uses synthetic names, reserved example domains, deterministic fixtures, and no real personal contact data.</p></section><section><h2>Requests</h2><p>Export and deletion requests are represented as auditable compliance workflows. Production contact details and retention periods will be added after legal approval.</p></section></PublicDocument>;
}
