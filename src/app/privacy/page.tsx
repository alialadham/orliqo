import { PublicDocument } from "@/components/public/public-shell";

export default function PrivacyPage() {
  return (
    <PublicDocument
      eyebrow="Legal"
      title="Privacy"
      summary="Orliqo limits access to workspace data and keeps provider credentials server-side."
    >
      <section>
        <h2>Workspace data</h2>
        <p>
          We process account, workspace, business, lead, campaign, message,
          billing, and integration data to provide the service. Workspace
          records are separated with membership checks, permission gates, and
          row-level security.
        </p>
      </section>
      <section>
        <h2>Provider credentials</h2>
        <p>
          Provider credentials are encrypted at rest, used only by server-side
          adapters, and are not exposed through client-readable tables. Provider
          webhooks are verified and recorded with replay protection.
        </p>
      </section>
      <section>
        <h2>Demo data</h2>
        <p>
          Demo mode uses synthetic identities, reserved example domains, and
          deterministic fixtures. Demo delivery is disabled.
        </p>
      </section>
      <section>
        <h2>Retention and requests</h2>
        <p>
          Data is retained while needed to operate the workspace, meet security
          and billing obligations, or comply with law. Access, export,
          correction, and deletion requests can be sent to support@orliqo.com
          and are handled through auditable workflows.
        </p>
      </section>
    </PublicDocument>
  );
}
