import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { assertSafePublicUrl, isPrivateAddress } from "@/lib/security/ssrf";

describe("website import SSRF protection", () => {
  it.each([
    "0.0.0.0",
    "10.1.2.3",
    "100.64.0.1",
    "127.0.0.1",
    "169.254.169.254",
    "172.20.0.1",
    "192.0.2.10",
    "192.168.1.1",
    "198.18.0.1",
    "198.51.100.9",
    "203.0.113.9",
    "224.0.0.1",
    "::1",
    "fc00::1",
    "fe80::1",
    "2001:db8::1",
    "::ffff:10.0.0.1",
  ])("blocks non-public address %s", (address) => {
    expect(isPrivateAddress(address)).toBe(true);
  });

  it.each(["8.8.8.8", "1.1.1.1", "2606:4700:4700::1111"])("allows public address %s", (address) => {
    expect(isPrivateAddress(address)).toBe(false);
  });

  it("rejects local hostnames and embedded credentials before DNS", async () => {
    await expect(assertSafePublicUrl("http://localhost/admin")).rejects.toThrow(/local/i);
    await expect(assertSafePublicUrl("http://[::1]/admin")).rejects.toThrow(/private/i);
    await expect(assertSafePublicUrl("https://user:secret@example.com")).rejects.toThrow(/credentials/i);
  });
});
