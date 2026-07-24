import { PublicDocument } from "@/components/public/public-shell";

export default function TermsPage() {
  return (
    <PublicDocument
      eyebrow="Legal"
      title="Terms"
      summary="These terms govern access to Orliqo and its evidence-backed outreach workflows."
    >
      <section>
        <h2>Authorized use</h2>
        <p>
          You must have authority to connect provider accounts and use workspace
          data. You are responsible for following provider policies, applicable
          outreach laws, consent requirements, and suppression obligations.
        </p>
      </section>
      <section>
        <h2>Review responsibility</h2>
        <p>
          Generated content must be reviewed before approval or delivery. Do
          not represent guessed contact details as verified, bypass opt-outs,
          or use Orliqo for deceptive or unlawful outreach.
        </p>
      </section>
      <section>
        <h2>Service safeguards</h2>
        <p>
          Orliqo may pause delivery, restrict access, or reject provider actions
          when safety checks, quotas, permissions, billing status, or provider
          requirements are not satisfied.
        </p>
      </section>
      <section>
        <h2>Contact</h2>
        <p>
          Questions about these terms can be sent to support@orliqo.com.
        </p>
      </section>
    </PublicDocument>
  );
}
