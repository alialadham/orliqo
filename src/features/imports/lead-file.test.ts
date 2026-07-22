import { describe, expect, it } from "vitest";

import { autoMapHeaders, mapImportRow, parseCsv } from "@/features/imports/lead-file";

describe("lead file import", () => {
  it("parses quoted CSV values and maps common columns", () => {
    const parsed = parseCsv('Company Name,Email,City\n"Cedar, Studio",hello@example.com,Amman');
    const mapping = autoMapHeaders(parsed.headers);
    const result = mapImportRow(parsed.rows[0]!, mapping);
    expect(result.mapped.businessName).toBe("Cedar, Studio");
    expect(result.mapped.email).toBe("hello@example.com");
    expect(result.errors).toEqual([]);
  });

  it("reports invalid required fields and email values", () => {
    const result = mapImportRow({ Company: "", Email: "not-an-email" }, { Company: "businessName", Email: "email" });
    expect(result.errors).toHaveLength(2);
  });
});
