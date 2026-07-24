import "server-only";

import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

import { z } from "zod";

import { isPrivateAddress } from "@/lib/security/ssrf";

const smtpConfigurationSchema = z.object({
  host: z.string().trim().min(1).max(253),
  port: z.number().int().min(1).max(65_535),
  secure: z.boolean(),
  username: z.string().trim().min(1).max(512),
  password: z.string().min(1).max(4096),
  from: z.email(),
});

export type SmtpConfiguration = z.infer<typeof smtpConfigurationSchema>;
export type ValidatedSmtpConfiguration = SmtpConfiguration & {
  address: string;
  family: 4 | 6;
};

export async function validateSmtpConfiguration(
  input: unknown,
  resolver: typeof lookup = lookup,
): Promise<ValidatedSmtpConfiguration> {
  const configuration = smtpConfigurationSchema.parse(input);
  const hostname = configuration.host.toLowerCase().replace(/\.$/, "");
  if (hostname === "localhost" || hostname.endsWith(".local"))
    throw new Error("Private and local SMTP hosts are blocked.");
  const addresses = isIP(hostname)
    ? [{ address: hostname, family: isIP(hostname) }]
    : await resolver(hostname, { all: true, verbatim: true });
  if (
    !addresses.length ||
    addresses.some(({ address }) => isPrivateAddress(address))
  )
    throw new Error("SMTP host resolves to a blocked network address.");
  if (configuration.secure && configuration.port === 25)
    throw new Error("Implicit TLS cannot use port 25.");
  const selected = addresses[0];
  if (!selected || (selected.family !== 4 && selected.family !== 6))
    throw new Error("SMTP host could not be resolved safely.");
  return {
    ...configuration,
    address: selected.address,
    family: selected.family,
  };
}
