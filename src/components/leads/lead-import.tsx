"use client";

import { useRef, useState } from "react";
import { ArrowLeft, CheckCircle2, Download, FileSpreadsheet, Loader2, Upload } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type PreviewRow = { rowNumber: number; raw: Record<string, string>; mapped: Record<string, string>; errors: string[]; duplicateId?: string; suppressed: boolean };
type Job = { id: string; headers: string[]; mapping: Record<string, string>; totalRows: number; validRows: number; invalidRows: number; duplicateRows: number; suppressedRows: number; preview: PreviewRow[] };
type Summary = { imported: number; updated: number; skipped: number; duplicate: number; invalid: number; suppressed: number };
const fields = ["businessName", "legalName", "industry", "category", "description", "country", "city", "address", "websiteUrl", "websiteStatus", "email", "phone", "instagramUrl", "facebookUrl", "linkedinUrl", "reviewCount", "averageRating", "services", "employeeEstimate", "revenueEstimate", "qualificationScore", "status", "tags"];

export function LeadImport() {
  const [job, setJob] = useState<Job | null>(null);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const fileInput = useRef<HTMLInputElement>(null);
  const router = useRouter();

  async function upload(file: File) {
    setBusy(true); setMessage(""); setSummary(null);
    const form = new FormData(); form.append("file", file);
    const response = await fetch("/api/imports/leads", { method: "POST", body: form });
    const payload = await response.json() as { job?: Job; error?: string };
    setBusy(false); if (!response.ok || !payload.job) { setMessage(payload.error || "Import preview failed."); return; } setJob(payload.job);
  }

  async function confirm() {
    if (!job) return; setBusy(true); setMessage("");
    const response = await fetch("/api/imports/leads", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ jobId: job.id, mapping: job.mapping, skipInvalid: true }) });
    const payload = await response.json() as { summary?: Summary; error?: string }; setBusy(false);
    if (!response.ok || !payload.summary) { setMessage(payload.error || "Import could not be completed."); return; }
    setSummary(payload.summary); setJob(null); router.refresh();
  }

  function sample() {
    const csv = "Business Name,Industry,Country,City,Website,Email,Phone,Score,Tags\nCedar Demo Studio,Photography,Jordan,Amman,https://cedar.example.test,hello@cedar.example.invalid,+962790001111,74,Sample;Import";
    const link = document.createElement("a"); link.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" })); link.download = "orliqo-lead-import-sample.csv"; link.click(); URL.revokeObjectURL(link.href);
  }

  return <div className="mx-auto max-w-6xl space-y-5"><Link href="/app/leads" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="size-4" />Back to leads</Link><div><p className="text-xs font-semibold uppercase tracking-wider text-primary">Core CRM</p><h1 className="mt-1 text-3xl font-bold">Import leads</h1><p className="mt-2 text-sm text-muted-foreground">Map, validate, and review CSV or XLSX data before creating records. Existing leads are never silently overwritten.</p></div>
    {message ? <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive" role="alert">{message}</div> : null}
    {summary ? <section className="rounded-xl border border-success/30 bg-card p-6"><div className="flex items-center gap-2"><CheckCircle2 className="text-success" /><h2 className="text-lg font-bold">Import complete</h2></div><div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">{Object.entries(summary).map(([label, count]) => <div key={label} className="rounded-lg border bg-background p-3"><p className="text-2xl font-bold tabular-nums">{count}</p><p className="text-xs capitalize text-muted-foreground">{label}</p></div>)}</div><Button asChild className="mt-5"><Link href="/app/leads">View leads</Link></Button></section> : null}
    {!job && !summary ? <section className="rounded-xl border bg-card p-6 surface-shadow sm:p-10"><label className="grid min-h-64 cursor-pointer place-items-center rounded-xl border-2 border-dashed bg-muted/25 p-8 text-center hover:border-primary/50"><span><span className="mx-auto grid size-12 place-items-center rounded-xl bg-primary/10 text-primary">{busy ? <Loader2 className="animate-spin" /> : <Upload />}</span><span className="mt-4 block text-lg font-semibold">{selectedFile?.name || "Choose CSV or XLSX"}</span><span className="mt-2 block text-sm text-muted-foreground">Up to 10 MB and 5,000 data rows.</span></span><input ref={fileInput} data-testid="lead-import-file" type="file" accept=".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" className="sr-only" disabled={busy} onChange={(event) => setSelectedFile(event.target.files?.[0] ?? null)} /></label><div className="mt-4 flex flex-wrap justify-between gap-2"><Button type="button" variant="ghost" onClick={sample}><Download />Download sample CSV</Button><Button data-testid="preview-import" type="button" disabled={busy} onClick={() => { const file = fileInput.current?.files?.[0]; if (file) upload(file); else setMessage("Choose a CSV or XLSX file first."); }}>{busy ? <Loader2 className="animate-spin" /> : <FileSpreadsheet />}Preview import</Button></div></section> : null}
    {job ? <><section className="rounded-xl border bg-card p-5 surface-shadow"><div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center"><div><h2 className="text-lg font-bold">Map spreadsheet columns</h2><p className="text-sm text-muted-foreground">Business name is required. Unmapped columns are ignored.</p></div><div className="flex gap-2"><Badge variant="outline">{job.totalRows} rows</Badge><Badge variant="outline" className={job.invalidRows ? "border-warning/30 bg-warning/10" : "border-success/30 bg-success/10"}>{job.invalidRows} invalid</Badge></div></div><div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{job.headers.map((header) => <label key={header} className="grid gap-1 text-xs font-medium text-muted-foreground"><span className="truncate">{header}</span><select value={job.mapping[header] ?? ""} onChange={(event) => setJob((current) => current ? { ...current, mapping: { ...current.mapping, [header]: event.target.value } } : current)} className="h-9 rounded-lg border bg-background px-2 text-sm text-foreground"><option value="">Ignore</option>{fields.map((field) => <option key={field} value={field}>{field.replace(/([A-Z])/g, " $1")}</option>)}</select></label>)}</div></section>
      <section className="overflow-hidden rounded-xl border bg-card surface-shadow"><div className="flex items-center justify-between border-b p-4"><h2 className="font-bold">Preview first rows</h2><span className="text-xs text-muted-foreground">{job.duplicateRows} duplicates · {job.suppressedRows} suppressed</span></div><div className="overflow-x-auto"><table className="w-full min-w-[760px] text-sm"><caption className="sr-only">Validated lead import preview</caption><thead className="bg-muted/40 text-left text-xs uppercase text-muted-foreground"><tr><th scope="col" className="p-3">Row</th><th scope="col" className="p-3">Business</th><th scope="col" className="p-3">Industry</th><th scope="col" className="p-3">Location</th><th scope="col" className="p-3">Email</th><th scope="col" className="p-3">Status</th></tr></thead><tbody className="divide-y">{job.preview.map((row) => { const remapped = Object.fromEntries(Object.entries(job.mapping).map(([header, field]) => [field, row.raw[header] ?? ""])); return <tr key={row.rowNumber}><th scope="row" className="p-3 font-normal">{row.rowNumber}</th><td className="p-3 font-medium">{remapped.businessName || "Missing"}</td><td className="p-3">{remapped.industry || "—"}</td><td className="p-3">{[remapped.city, remapped.country].filter(Boolean).join(", ") || "—"}</td><td className="p-3">{remapped.email || "—"}</td><td className="p-3">{row.suppressed ? <span className="text-destructive">Suppressed</span> : row.duplicateId ? <span className="text-warning">Duplicate</span> : row.errors.length ? <span className="text-destructive">{row.errors.join(" ")}</span> : <span className="text-success">Ready</span>}</td></tr>; })}</tbody></table></div><div className="flex flex-wrap justify-end gap-2 border-t p-4"><Button variant="outline" onClick={() => setJob(null)}>Cancel</Button><Button data-testid="confirm-import" disabled={busy || !Object.values(job.mapping).includes("businessName")} onClick={confirm}>{busy ? <Loader2 className="animate-spin" /> : <FileSpreadsheet />}Import valid rows</Button></div></section></> : null}
  </div>;
}
