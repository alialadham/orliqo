"use client";

import { useState } from "react";
import { Loader2, X } from "lucide-react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { saveLeadAction } from "@/features/leads/actions";
import type { LeadInput } from "@/features/leads/schemas";
import type { Lead } from "@/features/leads/types";

function emptyLead(): LeadInput {
  return { businessName: "", legalName: "", industry: "", category: "", description: "", country: "", city: "", address: "", websiteUrl: "", websiteStatus: "unknown", email: "", emailVerification: "missing", phone: "", phoneVerification: "missing", whatsappAvailable: false, whatsappConsent: "unknown", instagramUrl: "", facebookUrl: "", linkedinUrl: "", reviewCount: null, averageRating: null, services: [], employeeEstimate: null, revenueEstimate: null, qualificationScore: 0, qualificationReason: "", suggestedOpportunity: "", recommendedChannel: "email", personalizationAngle: "", status: "new", assignedTo: "", tags: [], duplicateOverride: false };
}

function fromLead(lead: Lead): LeadInput {
  return { id: lead.id, businessName: lead.businessName, legalName: lead.legalName, industry: lead.industry, category: lead.category, description: lead.description, country: lead.country, city: lead.city, address: lead.address, websiteUrl: lead.websiteUrl, websiteStatus: lead.websiteStatus, email: lead.email, emailVerification: lead.emailVerification, phone: lead.phone, phoneVerification: lead.phoneVerification, whatsappAvailable: lead.whatsappAvailable, whatsappConsent: lead.whatsappConsent, instagramUrl: lead.instagramUrl, facebookUrl: lead.facebookUrl, linkedinUrl: lead.linkedinUrl, reviewCount: lead.reviewCount, averageRating: lead.averageRating, services: lead.services, employeeEstimate: lead.employeeEstimate, revenueEstimate: lead.revenueEstimate, qualificationScore: lead.qualificationScore, qualificationReason: lead.qualificationReason, suggestedOpportunity: lead.suggestedOpportunity, recommendedChannel: lead.recommendedChannel, personalizationAngle: lead.personalizationAngle, status: lead.status, assignedTo: lead.assignedTo, tags: lead.tags, duplicateOverride: false };
}

function EditorField({ label, children, wide = false }: { label: string; children: React.ReactNode; wide?: boolean }) {
  return <label className={wide ? "grid gap-1.5 text-sm font-medium sm:col-span-2" : "grid gap-1.5 text-sm font-medium"}>{label}{children}</label>;
}

export function LeadEditor({ lead, teammates, onClose }: { lead?: Lead; teammates: Array<{ id: string; name: string }>; onClose: () => void }) {
  const [input, setInput] = useState<LeadInput>(lead ? fromLead(lead) : emptyLead());
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [duplicateId, setDuplicateId] = useState<string | null>(null);
  const router = useRouter();
  const set = <K extends keyof LeadInput>(key: K, value: LeadInput[K]) => setInput((current) => ({ ...current, [key]: value }));
  const number = (value: string) => value === "" ? null : Number(value);

  async function submit(override = false) {
    setSaving(true); setMessage("");
    const result = await saveLeadAction({ ...input, duplicateOverride: override });
    setSaving(false); setMessage(result.message); setDuplicateId(result.duplicateId ?? null);
    if (result.ok) { router.refresh(); onClose(); }
  }

  return <div className="fixed inset-0 z-50 bg-shell/55 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="lead-editor-title"><div className="ml-auto flex h-full w-full max-w-2xl flex-col bg-background shadow-2xl">
    <header className="flex items-center justify-between border-b px-5 py-4"><div><p className="text-xs font-semibold uppercase tracking-wider text-primary">Core CRM</p><h2 id="lead-editor-title" className="text-xl font-bold">{lead ? "Edit lead" : "Create lead"}</h2></div><Button type="button" variant="ghost" size="icon" onClick={onClose}><X /><span className="sr-only">Close</span></Button></header>
    <div className="flex-1 overflow-y-auto p-5"><div className="grid gap-5 sm:grid-cols-2">
      <EditorField label="Business name"><Input data-testid="lead-business-name" value={input.businessName} onChange={(event) => set("businessName", event.target.value)} /></EditorField><EditorField label="Legal name"><Input value={input.legalName} onChange={(event) => set("legalName", event.target.value)} /></EditorField>
      <EditorField label="Industry"><Input value={input.industry} onChange={(event) => set("industry", event.target.value)} /></EditorField><EditorField label="Category"><Input value={input.category} onChange={(event) => set("category", event.target.value)} /></EditorField>
      <EditorField label="Description" wide><Textarea value={input.description} onChange={(event) => set("description", event.target.value)} /></EditorField>
      <EditorField label="Country"><Input value={input.country} onChange={(event) => set("country", event.target.value)} /></EditorField><EditorField label="City"><Input value={input.city} onChange={(event) => set("city", event.target.value)} /></EditorField>
      <EditorField label="Address" wide><Input value={input.address} onChange={(event) => set("address", event.target.value)} /></EditorField>
      <EditorField label="Website URL"><Input type="url" value={input.websiteUrl} onChange={(event) => set("websiteUrl", event.target.value)} /></EditorField><EditorField label="Website status"><select className="h-8 rounded-lg border bg-transparent px-2.5 text-sm" value={input.websiteStatus} onChange={(event) => set("websiteStatus", event.target.value)}><option value="unknown">Unknown</option><option value="healthy">Healthy</option><option value="no_website">No website</option><option value="outdated">Outdated</option><option value="poor_mobile">Poor mobile</option><option value="slow">Slow</option><option value="no_booking">No booking</option></select></EditorField>
      <EditorField label="Email"><Input type="email" value={input.email} onChange={(event) => set("email", event.target.value)} /></EditorField><EditorField label="Email verification"><select className="h-8 rounded-lg border bg-transparent px-2.5 text-sm" value={input.emailVerification} onChange={(event) => set("emailVerification", event.target.value as LeadInput["emailVerification"])}>{["missing", "unverified", "verified", "risky", "invalid"].map((value) => <option key={value}>{value}</option>)}</select></EditorField>
      <EditorField label="Phone"><Input value={input.phone} onChange={(event) => set("phone", event.target.value)} /></EditorField><EditorField label="Phone verification"><select className="h-8 rounded-lg border bg-transparent px-2.5 text-sm" value={input.phoneVerification} onChange={(event) => set("phoneVerification", event.target.value as LeadInput["phoneVerification"])}>{["missing", "unverified", "verified", "risky", "invalid"].map((value) => <option key={value}>{value}</option>)}</select></EditorField>
      <EditorField label="Instagram URL"><Input type="url" value={input.instagramUrl} onChange={(event) => set("instagramUrl", event.target.value)} /></EditorField><EditorField label="LinkedIn URL"><Input type="url" value={input.linkedinUrl} onChange={(event) => set("linkedinUrl", event.target.value)} /></EditorField>
      <EditorField label="Facebook URL"><Input type="url" value={input.facebookUrl} onChange={(event) => set("facebookUrl", event.target.value)} /></EditorField><EditorField label="Services"><Input value={input.services.join(", ")} onChange={(event) => set("services", event.target.value.split(",").map((item) => item.trim()).filter(Boolean))} /></EditorField>
      <EditorField label="Review count"><Input type="number" min="0" value={input.reviewCount ?? ""} onChange={(event) => set("reviewCount", number(event.target.value))} /></EditorField><EditorField label="Average rating"><Input type="number" min="0" max="5" step="0.1" value={input.averageRating ?? ""} onChange={(event) => set("averageRating", number(event.target.value))} /></EditorField>
      <EditorField label="Employee estimate"><Input type="number" min="0" value={input.employeeEstimate ?? ""} onChange={(event) => set("employeeEstimate", number(event.target.value))} /></EditorField><EditorField label="Revenue estimate"><Input type="number" min="0" value={input.revenueEstimate ?? ""} onChange={(event) => set("revenueEstimate", number(event.target.value))} /></EditorField>
      <EditorField label="Qualification score"><Input type="number" min="0" max="100" value={input.qualificationScore} onChange={(event) => set("qualificationScore", Number(event.target.value))} /></EditorField><EditorField label="Status"><select className="h-8 rounded-lg border bg-transparent px-2.5 text-sm" value={input.status} onChange={(event) => set("status", event.target.value as LeadInput["status"])}>{["new", "qualified", "disqualified", "contacted", "replied", "interested", "won", "lost", "do_not_contact", "archived"].map((value) => <option key={value}>{value.replaceAll("_", " ")}</option>)}</select></EditorField>
      <EditorField label="Qualification reason" wide><Textarea value={input.qualificationReason} onChange={(event) => set("qualificationReason", event.target.value)} /></EditorField><EditorField label="Suggested opportunity" wide><Textarea value={input.suggestedOpportunity} onChange={(event) => set("suggestedOpportunity", event.target.value)} /></EditorField>
      <EditorField label="Recommended channel"><select className="h-8 rounded-lg border bg-transparent px-2.5 text-sm" value={input.recommendedChannel} onChange={(event) => set("recommendedChannel", event.target.value as LeadInput["recommendedChannel"])}>{["email", "whatsapp", "instagram", "linkedin", "manual_call"].map((value) => <option key={value}>{value.replaceAll("_", " ")}</option>)}</select></EditorField><EditorField label="Assigned teammate"><select className="h-8 rounded-lg border bg-transparent px-2.5 text-sm" value={input.assignedTo} onChange={(event) => set("assignedTo", event.target.value)}><option value="">Unassigned</option>{teammates.map((person) => <option key={person.id} value={person.id}>{person.name}</option>)}</select></EditorField>
      <EditorField label="Personalization angle" wide><Textarea value={input.personalizationAngle} onChange={(event) => set("personalizationAngle", event.target.value)} /></EditorField><EditorField label="Tags" wide><Input value={input.tags.join(", ")} onChange={(event) => set("tags", event.target.value.split(",").map((item) => item.trim()).filter(Boolean))} /></EditorField>
      <label className="flex items-center gap-2 rounded-lg border p-3 text-sm"><Checkbox checked={input.whatsappAvailable} onCheckedChange={(checked) => set("whatsappAvailable", Boolean(checked))} />WhatsApp available</label>
    </div></div>
    <footer className="border-t bg-background p-4"><div className="mb-3 min-h-5 text-sm text-muted-foreground" role="status">{message}{duplicateId ? <span> <a className="text-primary underline" href={`/app/leads/${duplicateId}`}>Open duplicate</a></span> : null}</div><div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={onClose}>Cancel</Button>{duplicateId ? <Button type="button" variant="destructive" disabled={saving} onClick={() => submit(true)}>Save as separate lead</Button> : null}<Button data-testid="save-lead" type="button" disabled={saving} onClick={() => submit(false)}>{saving ? <Loader2 className="animate-spin" /> : null}Save lead</Button></div></footer>
  </div></div>;
}
