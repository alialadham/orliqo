# Onboarding

`/onboarding` persists six validated steps: Business, Offer, Audience, Channels,
Goals, and Review. Incomplete users resume at the stored step. Owners and
administrators can edit the same data later at `/app/settings/workspace`; viewers
receive read-only behavior.

Website suggestions show their public source and retrieval time and never overwrite
fields without an explicit per-field or accept-all decision. Live imports create a
durable job and poll its permissioned status; demo imports remain deterministic and
make no network request. Logo files use private, workspace-prefixed Storage paths.
Review shows missing configuration, warnings, estimated AI usage, and plan guidance
before completion.

`Save as draft` keeps the stored step and leaves the protected app. Completion is
validated again on the server and redirects to the dashboard. The campaign action
is labeled as a Phase 3 preview and does not send or queue outreach.
