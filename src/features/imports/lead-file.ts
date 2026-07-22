import ExcelJS from "exceljs";

export const LEAD_IMPORT_FIELDS = ["businessName", "legalName", "industry", "category", "description", "country", "city", "address", "websiteUrl", "websiteStatus", "email", "phone", "instagramUrl", "facebookUrl", "linkedinUrl", "reviewCount", "averageRating", "services", "employeeEstimate", "revenueEstimate", "qualificationScore", "status", "tags"] as const;
export type LeadImportField = (typeof LEAD_IMPORT_FIELDS)[number];

const aliases: Record<LeadImportField, string[]> = {
  businessName: ["business", "business name", "company", "company name", "name"], legalName: ["legal name"], industry: ["industry"], category: ["category"], description: ["description", "about"], country: ["country"], city: ["city", "location"], address: ["address"], websiteUrl: ["website", "website url", "url", "domain"], websiteStatus: ["website status"], email: ["email", "email address"], phone: ["phone", "phone number", "mobile", "whatsapp"], instagramUrl: ["instagram", "instagram url"], facebookUrl: ["facebook", "facebook url"], linkedinUrl: ["linkedin", "linkedin url"], reviewCount: ["reviews", "review count"], averageRating: ["rating", "average rating"], services: ["services", "products"], employeeEstimate: ["employees", "employee estimate", "headcount"], revenueEstimate: ["revenue", "revenue estimate"], qualificationScore: ["score", "qualification score"], status: ["status", "lead status"], tags: ["tags", "labels"],
};

function normalizeHeader(value: string): string { return value.trim().toLowerCase().replace(/[_-]+/g, " ").replace(/\s+/g, " "); }

export function autoMapHeaders(headers: string[]): Record<string, LeadImportField> {
  const mapping: Record<string, LeadImportField> = {};
  for (const header of headers) {
    const normalized = normalizeHeader(header);
    const field = LEAD_IMPORT_FIELDS.find((item) => aliases[item].includes(normalized));
    if (field) mapping[header] = field;
  }
  return mapping;
}

function parseCsvLine(line: string): string[] {
  const values: string[] = []; let current = ""; let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    if (character === '"' && quoted && line[index + 1] === '"') { current += '"'; index += 1; }
    else if (character === '"') quoted = !quoted;
    else if (character === "," && !quoted) { values.push(current.trim()); current = ""; }
    else current += character;
  }
  values.push(current.trim()); return values;
}

export function parseCsv(text: string): { headers: string[]; rows: Record<string, string>[] } {
  const lines = text.replace(/^\uFEFF/, "").split(/\r?\n/).filter((line) => line.trim());
  if (!lines.length) return { headers: [], rows: [] };
  const headers = parseCsvLine(lines[0]!).map((header, index) => header || `Column ${index + 1}`);
  const rows = lines.slice(1).map((line) => Object.fromEntries(headers.map((header, index) => [header, parseCsvLine(line)[index] ?? ""])));
  return { headers, rows };
}

function cellText(value: ExcelJS.CellValue): string {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "object") {
    if ("text" in value && typeof value.text === "string") return value.text;
    if ("result" in value) return String(value.result ?? "");
    if ("richText" in value && Array.isArray(value.richText)) return value.richText.map((item) => item.text).join("");
  }
  return String(value);
}

export async function parseLeadFile(buffer: ArrayBuffer, extension: "csv" | "xlsx"): Promise<{ headers: string[]; rows: Record<string, string>[] }> {
  if (extension === "csv") return parseCsv(new TextDecoder().decode(buffer));
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);
  const sheet = workbook.worksheets[0];
  if (!sheet) return { headers: [], rows: [] };
  const headerRow = sheet.getRow(1);
  const headers = Array.from({ length: headerRow.cellCount }, (_, index) => cellText(headerRow.getCell(index + 1).value).trim() || `Column ${index + 1}`);
  const rows: Record<string, string>[] = [];
  sheet.eachRow((row, rowNumber) => { if (rowNumber > 1) rows.push(Object.fromEntries(headers.map((header, index) => [header, cellText(row.getCell(index + 1).value).trim()]))); });
  return { headers, rows };
}

export function mapImportRow(raw: Record<string, string>, mapping: Record<string, string>): { mapped: Record<string, string>; errors: string[] } {
  const mapped: Record<string, string> = {};
  for (const [header, field] of Object.entries(mapping)) if (field) mapped[field] = raw[header] ?? "";
  const errors: string[] = [];
  if (!mapped.businessName?.trim()) errors.push("Business name is required.");
  if (mapped.email && !/^\S+@\S+\.\S+$/.test(mapped.email)) errors.push("Email is invalid.");
  if (mapped.qualificationScore && (Number.isNaN(Number(mapped.qualificationScore)) || Number(mapped.qualificationScore) < 0 || Number(mapped.qualificationScore) > 100)) errors.push("Score must be 0–100.");
  return { mapped, errors };
}
