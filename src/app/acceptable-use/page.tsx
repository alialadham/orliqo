import type { Metadata } from "next";

import { PublicDocument } from "@/components/public/public-shell";

export const metadata: Metadata = { title: "Acceptable Use Policy" };

export default function AcceptableUsePage() {
  return <PublicDocument eyebrow="Safety" title="Acceptable Use Policy" summary="Orliqo supports responsible, permission-aware business outreach through authorized channels.">
    <p><strong>Effective date:</strong> 11 August 2026</p>
    <section><h2>Use accurate and lawfully obtained data</h2><p>Use only contact data you are authorized and legally permitted to process. Keep sources and verification status accurate. Do not scrape where prohibited by law, access controls, robots directives, or source terms; buy unlawfully obtained lists; fabricate verification; or present inferred data as confirmed fact.</p></section>
    <section><h2>Respect recipients</h2><p>Use a truthful sender identity, headers, subjects, and business purpose. Provide notices, sender details, and opt-out mechanisms required for each recipient and channel. Honor unsubscribe, objection, stop-contact, complaint, hard-bounce, and suppression signals promptly. Do not contact recipients who lack required consent or another lawful basis.</p></section>
    <section><h2>No harmful or abusive activity</h2><p>Do not send spam, phishing, malware, harassment, threats, discriminatory targeting, deceptive claims, illegal goods or services, or content that infringes another person’s rights. Do not evade provider limits, rotate identities to bypass enforcement, interfere with service security, or use unofficial automation that violates a provider’s rules.</p></section>
    <section><h2>Channel responsibility</h2><p>Email, WhatsApp, social platforms, and calling rules differ by country and recipient type. Use official provider connections, required templates and consent for WhatsApp, and manual workflows where automated use is not authorized. You remain responsible for local sending windows and applicable marketing, telemarketing, privacy, and consumer-protection rules.</p></section>
    <section><h2>Enforcement and reporting</h2><p>Orliqo may block, rate-limit, pause, investigate, or terminate activity that risks recipients, providers, the service, or other customers. Report suspected abuse to <a href="mailto:abuse@orliqo.com">abuse@orliqo.com</a>.</p></section>
  </PublicDocument>;
}
