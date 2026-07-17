import { PublicDocument } from "@/components/public/public-shell";

export default function TermsPage() {
  return <PublicDocument eyebrow="Legal draft" title="Terms" summary="These development terms are placeholders for counsel-approved production terms and do not create a live commercial service."><section><h2>Authorized use</h2><p>Users must have authority to connect provider accounts and must follow provider policies, applicable outreach laws, consent rules, and suppression requirements.</p></section><section><h2>Review responsibility</h2><p>Generated content must be reviewed before sending. Orliqo does not label guessed contact details as verified and blocks live delivery while demo mode is active.</p></section></PublicDocument>;
}
