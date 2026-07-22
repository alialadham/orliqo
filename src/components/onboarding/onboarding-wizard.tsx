"use client";

import { useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, Check, Globe2, Loader2, Plus, Sparkles, Trash2 } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  completeOnboardingAction,
  completeOnboardingAndStartCampaignAction,
  decideWebsiteSuggestionsAction,
  duplicateIcpAction,
  saveBusinessAction,
  saveChannelsAction,
  saveGoalsAction,
  saveIcpAction,
  saveOfferAction,
  saveOnboardingDraftAction,
} from "@/features/onboarding/actions";
import { ONBOARDING_STEPS, type IcpInput, type OnboardingState, type WebsiteImportResult } from "@/features/onboarding/types";
import { cn } from "@/lib/utils";

const websiteStatuses = [["no_website", "No website"], ["outdated", "Outdated website"], ["poor_mobile", "Poor mobile experience"], ["directory_only", "Directory page only"], ["slow", "Slow website"], ["no_booking", "No online booking"], ["no_ecommerce", "No e-commerce"], ["no_bilingual", "No bilingual support"]] as const;
const channelCopy = {
  email: ["Email", "Connect a supported mailbox in a later phase. Drafting is available now.", "Capacity follows the future provider limit."],
  whatsapp: ["WhatsApp Business", "Requires the official Business Platform and approved templates.", "Capacity is unavailable until official setup."],
  instagram: ["Instagram", "Manual-send only in Phase 2.", "Capacity is user-managed."],
  linkedin: ["LinkedIn", "Manual-send only in Phase 2.", "Capacity is user-managed."],
  manual_call: ["Manual Call List", "Available immediately for exported call lists.", "Capacity is user-managed."],
} as const;

type Notice = { tone: "success" | "error"; text: string } | null;

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return <label className="grid gap-1.5 text-sm font-medium">{label}{children}{hint ? <span className="text-xs font-normal text-muted-foreground">{hint}</span> : null}</label>;
}

function CsvInput({ label, value, onChange, placeholder }: { label: string; value: string[]; onChange: (value: string[]) => void; placeholder?: string }) {
  return <Field label={label}><Input value={value.join(", ")} placeholder={placeholder} onChange={(event) => onChange(event.target.value.split(",").map((item) => item.trim()).filter(Boolean))} /></Field>;
}

function NumberInput({ value, onChange, min = 0, max }: { value: number | null; onChange: (value: number | null) => void; min?: number; max?: number }) {
  return <Input type="number" min={min} max={max} value={value ?? ""} onChange={(event) => onChange(event.target.value === "" ? null : Number(event.target.value))} />;
}

export function OnboardingWizard({ initialState, canEdit, embedded = false }: { initialState: OnboardingState; canEdit: boolean; embedded?: boolean }) {
  const [state, setState] = useState(initialState);
  const [step, setStep] = useState(initialState.completed ? 1 : initialState.currentStep);
  const [notice, setNotice] = useState<Notice>(null);
  const [saving, setSaving] = useState(false);
  const [websiteImport, setWebsiteImport] = useState<WebsiteImportResult | null>(null);
  const [importing, setImporting] = useState(false);
  const [activeIcpId, setActiveIcpId] = useState(state.icps.find((icp) => !icp.archived)?.id ?? "");
  const activeIcp = state.icps.find((icp) => icp.id === activeIcpId) ?? state.icps.find((icp) => !icp.archived) ?? state.icps[0];

  const missing = useMemo(() => [
    !state.business.companyName && "Company name",
    !state.business.description && "Business description",
    !state.offer.mainService && "Main service",
    !state.icps.some((icp) => !icp.archived) && "Ideal customer profile",
    !state.channels.some((channel) => channel.enabled) && "Outreach channel",
  ].filter(Boolean) as string[], [state]);

  async function persistCurrent() {
    setSaving(true); setNotice(null);
    const result = step === 1 ? await saveBusinessAction(state.business)
      : step === 2 ? await saveOfferAction(state.offer)
      : step === 3 && activeIcp ? await saveIcpAction(activeIcp)
      : step === 4 ? await saveChannelsAction(state.channels)
      : step === 5 ? await saveGoalsAction(state.goals)
      : { ok: true, message: "Review ready." };
    setSaving(false);
    if (!result.ok) { setNotice({ tone: "error", text: result.message }); return false; }
    setNotice({ tone: "success", text: result.message });
    return true;
  }

  async function continueStep() {
    if (!(await persistCurrent())) return;
    setStep((current) => Math.min(6, current + 1) as OnboardingState["currentStep"]);
  }

  async function importWebsite() {
    setImporting(true); setNotice(null);
    try {
      const response = await fetch("/api/imports/website", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ url: state.business.websiteUrl }) });
      let payload = await response.json() as { status?: string; importId?: string; result?: WebsiteImportResult; error?: string };
      if (!response.ok) throw new Error(payload.error || "Website import failed.");
      if (!payload.result && payload.importId) {
        const importId = payload.importId;
        setNotice({ tone: "success", text: "Import queued. We’re checking the cited website safely." });
        for (let attempt = 0; attempt < 45 && !payload.result; attempt += 1) {
          await new Promise((resolve) => window.setTimeout(resolve, 1_000));
          const statusResponse = await fetch(`/api/imports/website?importId=${encodeURIComponent(importId)}`, { cache: "no-store" });
          payload = await statusResponse.json() as typeof payload;
          if (!statusResponse.ok || payload.status === "failed") throw new Error(payload.error || "Website import failed.");
        }
      }
      if (!payload.result) throw new Error("Website import is still processing. Try again shortly.");
      setWebsiteImport(payload.result);
      setNotice({ tone: "success", text: "Suggestions are ready. Review each item before applying it." });
    } catch (error) {
      setNotice({ tone: "error", text: error instanceof Error ? error.message : "Website import failed safely." });
    } finally { setImporting(false); }
  }

  async function decideImport(acceptedIds: string[], rejectRemaining = false) {
    if (!websiteImport) return;
    const rejectedIds = rejectRemaining ? websiteImport.suggestions.filter((item) => !acceptedIds.includes(item.id)).map((item) => item.id) : [];
    if (acceptedIds.length) {
      for (const suggestion of websiteImport.suggestions.filter((item) => acceptedIds.includes(item.id))) {
        if (suggestion.field === "description" && typeof suggestion.value === "string") setState((current) => ({ ...current, business: { ...current.business, description: suggestion.value as string } }));
        if (suggestion.field === "mainService" && typeof suggestion.value === "string") setState((current) => ({ ...current, offer: { ...current.offer, mainService: suggestion.value as string } }));
        if (suggestion.field === "additionalServices" && Array.isArray(suggestion.value)) setState((current) => ({ ...current, offer: { ...current.offer, additionalServices: suggestion.value as string[] } }));
        if (suggestion.field === "brandTone" && typeof suggestion.value === "string") setState((current) => ({ ...current, offer: { ...current.offer, brandTone: suggestion.value as string } }));
        if (suggestion.field === "sellingPoints" && Array.isArray(suggestion.value)) setState((current) => ({ ...current, offer: { ...current.offer, sellingPoints: suggestion.value as string[] } }));
        if (suggestion.field === "targetIndustries" && Array.isArray(suggestion.value)) setState((current) => ({ ...current, icps: current.icps.map((icp) => icp.isDefault ? { ...icp, industries: suggestion.value as string[] } : icp) }));
      }
    }
    const result = await decideWebsiteSuggestionsAction({ importId: websiteImport.id, acceptedIds, rejectedIds });
    setNotice({ tone: result.ok ? "success" : "error", text: result.message });
    if (result.ok) {
      const remaining = websiteImport.suggestions.filter((item) => !acceptedIds.includes(item.id) && !rejectedIds.includes(item.id));
      setWebsiteImport(remaining.length ? { ...websiteImport, suggestions: remaining } : null);
    }
  }

  return (
    <div className={cn("min-h-0", !embedded && "pb-24")}>
      <header className={cn("sticky top-0 z-30 border-b bg-background/95 backdrop-blur", embedded && "rounded-t-xl")}>
        <div className="mx-auto max-w-6xl px-4 py-4 sm:px-6">
          <div className="mb-3 flex items-center justify-between text-xs font-medium text-muted-foreground"><span>Step {step} of 6</span><span>{Math.round((step / 6) * 100)}% complete</span></div>
          <ol className="grid grid-cols-6 gap-1.5" aria-label="Onboarding progress">
            {ONBOARDING_STEPS.map((label, index) => <li key={label}><button type="button" disabled={!canEdit && index + 1 !== step} onClick={() => setStep((index + 1) as OnboardingState["currentStep"])} className={cn("h-1.5 w-full rounded-full bg-muted", index + 1 <= step && "bg-primary")}><span className="sr-only">{label}</span></button><span className="mt-2 hidden text-center text-[11px] text-muted-foreground sm:block">{label}</span></li>)}
          </ol>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-10">
        {!canEdit ? <div className="mb-6 rounded-lg border border-warning/30 bg-warning/10 p-4 text-sm">Your workspace role is read-only. You can review this profile but cannot change it.</div> : null}
        {notice ? <div role="status" className={cn("mb-6 rounded-lg border p-3 text-sm", notice.tone === "error" ? "border-destructive/30 bg-destructive/5 text-destructive" : "border-success/30 bg-success/5")}>{notice.text}</div> : null}
        <section className="rounded-xl border bg-card p-5 surface-shadow sm:p-8" aria-labelledby={`step-${step}-title`}>
          {step === 1 ? <BusinessStep state={state} setState={setState} canEdit={canEdit} importing={importing} onImport={importWebsite} websiteImport={websiteImport} onDecideImport={decideImport} /> : null}
          {step === 2 ? <OfferStep state={state} setState={setState} canEdit={canEdit} /> : null}
          {step === 3 ? <AudienceStep state={state} setState={setState} canEdit={canEdit} activeIcpId={activeIcp?.id ?? ""} onSelect={setActiveIcpId} onDuplicate={async (id) => { const result = await duplicateIcpAction(id); setNotice({ tone: result.ok ? "success" : "error", text: result.message }); }} /> : null}
          {step === 4 ? <ChannelsStep state={state} setState={setState} canEdit={canEdit} /> : null}
          {step === 5 ? <GoalsStep state={state} setState={setState} canEdit={canEdit} /> : null}
          {step === 6 ? <ReviewStep state={state} missing={missing} /> : null}
        </section>
      </main>

      <footer className="fixed inset-x-0 bottom-0 z-30 border-t bg-background/95 px-4 py-3 backdrop-blur lg:left-[228px]">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-3">
          <Button type="button" variant="outline" disabled={step === 1 || saving} onClick={() => setStep((current) => Math.max(1, current - 1) as OnboardingState["currentStep"])}><ArrowLeft />Back</Button>
          <div className="flex items-center gap-2">
            {step === 6 && embedded ? <Button asChild><Link href="/app/dashboard">Return to dashboard<ArrowRight /></Link></Button> : step === 6 ? <>
              <form action={saveOnboardingDraftAction}><Button type="submit" variant="outline">Save as draft</Button></form>
              <form action={completeOnboardingAndStartCampaignAction}><Button type="submit" variant="outline" disabled={!canEdit || missing.length > 0}>Start first campaign <span className="hidden sm:inline">(Phase 3 preview)</span></Button></form>
              <form action={completeOnboardingAction}><Button type="submit" disabled={!canEdit || missing.length > 0}>Complete onboarding<Check /></Button></form>
            </> : <Button type="button" disabled={!canEdit || saving} onClick={continueStep}>{saving ? <Loader2 className="animate-spin" /> : null}Save & continue<ArrowRight /></Button>}
          </div>
        </div>
      </footer>
    </div>
  );
}

function StepHeading({ id, eyebrow, title, description }: { id: string; eyebrow: string; title: string; description: string }) {
  return <div className="mb-7"><p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">{eyebrow}</p><h1 id={id} className="mt-2 text-2xl font-bold sm:text-3xl">{title}</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">{description}</p></div>;
}

function BusinessStep({ state, setState, canEdit, importing, onImport, websiteImport, onDecideImport }: { state: OnboardingState; setState: React.Dispatch<React.SetStateAction<OnboardingState>>; canEdit: boolean; importing: boolean; onImport: () => void; websiteImport: WebsiteImportResult | null; onDecideImport: (acceptedIds: string[], rejectRemaining?: boolean) => void }) {
  const [logoPreview, setLogoPreview] = useState(state.business.logoUrl.startsWith("http") ? state.business.logoUrl : "");
  const [logoMessage, setLogoMessage] = useState(state.business.logoUrl ? "Logo stored securely." : "");
  const set = (key: keyof OnboardingState["business"], value: string) => setState((current) => ({ ...current, business: { ...current.business, [key]: value } }));
  async function uploadLogo(file: File) {
    setLogoPreview(URL.createObjectURL(file)); setLogoMessage("Uploading…");
    const form = new FormData(); form.append("file", file);
    const response = await fetch("/api/workspace/logo", { method: "POST", body: form });
    const payload = await response.json() as { logoUrl?: string; previewUrl?: string; error?: string };
    if (!response.ok || !payload.logoUrl) { setLogoMessage(payload.error || "Logo upload failed."); return; }
    set("logoUrl", payload.logoUrl); if (payload.previewUrl) setLogoPreview(payload.previewUrl); setLogoMessage("Logo uploaded securely.");
  }
  async function removeLogo() {
    await fetch("/api/workspace/logo", { method: "DELETE", headers: { "content-type": "application/json" }, body: JSON.stringify({ logoUrl: state.business.logoUrl }) });
    set("logoUrl", ""); setLogoPreview(""); setLogoMessage("Logo removed.");
  }
  return <><StepHeading id="step-1-title" eyebrow="Business" title="Tell us about your company" description="This context powers your ideal customer profile, research, and future campaign drafts." />
    <div className="grid gap-5 sm:grid-cols-2">
      <Field label="Company name"><Input data-testid="company-name" disabled={!canEdit} value={state.business.companyName} onChange={(event) => set("companyName", event.target.value)} /></Field>
      <Field label="Industry"><Input disabled={!canEdit} value={state.business.industry} onChange={(event) => set("industry", event.target.value)} /></Field>
      <Field label="Website"><div className="flex gap-2"><Input type="url" disabled={!canEdit} placeholder="https://example.com" value={state.business.websiteUrl} onChange={(event) => set("websiteUrl", event.target.value)} /><Button type="button" aria-label="Import from website" variant="outline" disabled={!canEdit || !state.business.websiteUrl || importing} onClick={onImport}>{importing ? <Loader2 className="animate-spin" /> : <Globe2 />}<span className="hidden sm:inline">Import</span></Button></div></Field>
      <Field label="Company size"><Input disabled={!canEdit} placeholder="2-10" value={state.business.companySize} onChange={(event) => { set("companySize", event.target.value); set("employeeRange", event.target.value); }} /></Field>
      <Field label="Country"><Input disabled={!canEdit} value={state.business.country} onChange={(event) => set("country", event.target.value)} /></Field>
      <Field label="City"><Input disabled={!canEdit} value={state.business.city} onChange={(event) => set("city", event.target.value)} /></Field>
      <div className="sm:col-span-2"><Field label="Business description"><Textarea disabled={!canEdit} className="min-h-28" value={state.business.description} onChange={(event) => set("description", event.target.value)} /></Field></div>
      <Field label="Instagram URL"><Input type="url" disabled={!canEdit} value={state.business.instagramUrl} onChange={(event) => set("instagramUrl", event.target.value)} /></Field>
      <Field label="LinkedIn URL"><Input type="url" disabled={!canEdit} value={state.business.linkedinUrl} onChange={(event) => set("linkedinUrl", event.target.value)} /></Field>
      <Field label="WhatsApp number" hint="Include country code where possible."><Input disabled={!canEdit} value={state.business.whatsappNumber} onChange={(event) => set("whatsappNumber", event.target.value)} /></Field>
      <Field label="Logo" hint="PNG, JPG, or WebP up to 2 MB. Stored privately by workspace."><div className="flex items-center gap-3">{logoPreview ? <Image unoptimized src={logoPreview} width={40} height={40} alt="Logo preview" className="size-10 rounded-lg border object-cover" /> : null}<Input type="file" accept="image/png,image/jpeg,image/webp" disabled={!canEdit} onChange={(event) => { const file = event.target.files?.[0]; if (file) uploadLogo(file); }} />{state.business.logoUrl ? <Button type="button" size="sm" variant="ghost" onClick={removeLogo}>Remove</Button> : null}</div>{logoMessage ? <span className="text-xs font-normal text-muted-foreground">{logoMessage}</span> : null}</Field>
    </div>
    {websiteImport ? <div className="mt-7 rounded-xl border border-primary/25 bg-primary/[0.03] p-4"><div className="flex items-start justify-between gap-3"><div><h2 className="font-semibold">Review website suggestions</h2><p className="text-xs text-muted-foreground">{websiteImport.provider} · {websiteImport.model} · {websiteImport.normalizedUrl}</p></div><Sparkles className="size-5 text-primary" /></div><div className="mt-4 divide-y rounded-lg border bg-background">{websiteImport.suggestions.map((item) => <div key={item.id} className="grid gap-2 p-3 text-sm sm:grid-cols-[150px_1fr_auto]"><span className="font-medium">{item.field}</span><span className="text-muted-foreground">{Array.isArray(item.value) ? item.value.join(", ") : item.value}</span><Button type="button" size="sm" variant="outline" onClick={() => onDecideImport([item.id])}>Accept</Button><span className="text-[11px] text-muted-foreground sm:col-start-2">Source: {item.sourceUrl} · {new Date(item.retrievedAt).toLocaleString()}</span></div>)}</div><div className="mt-4 flex flex-wrap gap-2"><Button type="button" onClick={() => onDecideImport(websiteImport.suggestions.map((item) => item.id))}>Accept all</Button><Button type="button" variant="outline" onClick={() => onDecideImport([], true)}>Reject all</Button></div></div> : null}
  </>;
}

function OfferStep({ state, setState, canEdit }: { state: OnboardingState; setState: React.Dispatch<React.SetStateAction<OnboardingState>>; canEdit: boolean }) {
  const set = <K extends keyof OnboardingState["offer"]>(key: K, value: OnboardingState["offer"][K]) => setState((current) => ({ ...current, offer: { ...current.offer, [key]: value } }));
  return <><StepHeading id="step-2-title" eyebrow="Offer" title="Shape the offer you want to lead with" description="Keep the offer concrete. These defaults remain editable before any future outreach." /><div className="grid gap-5 sm:grid-cols-2">
    <Field label="Main service"><Input disabled={!canEdit} value={state.offer.mainService} onChange={(event) => set("mainService", event.target.value)} /></Field>
    <Field label="Average project value"><div className="flex gap-2"><Input type="number" min="0" disabled={!canEdit} value={state.offer.averageProjectValue} onChange={(event) => set("averageProjectValue", Number(event.target.value))} /><Input className="w-24" maxLength={3} disabled={!canEdit} value={state.offer.currency} onChange={(event) => set("currency", event.target.value.toUpperCase())} /></div></Field>
    <div className="sm:col-span-2"><CsvInput label="Additional services" value={state.offer.additionalServices} onChange={(value) => set("additionalServices", value)} placeholder="Website audits, Lead research" /></div>
    <Field label="Pricing model"><Input disabled={!canEdit} value={state.offer.pricingModel} onChange={(event) => set("pricingModel", event.target.value)} /></Field>
    <Field label="Sales cycle"><Input disabled={!canEdit} value={state.offer.salesCycle} onChange={(event) => set("salesCycle", event.target.value)} /></Field>
    <div className="sm:col-span-2"><Field label="Main customer problem"><Textarea disabled={!canEdit} value={state.offer.mainCustomerProblem} onChange={(event) => set("mainCustomerProblem", event.target.value)} /></Field></div>
    <div className="sm:col-span-2"><Field label="Competitive advantage"><Textarea disabled={!canEdit} value={state.offer.competitiveAdvantage} onChange={(event) => set("competitiveAdvantage", event.target.value)} /></Field></div>
    <Field label="Default call to action"><select className="h-8 rounded-lg border bg-transparent px-2.5 text-sm" disabled={!canEdit} value={state.offer.defaultCta} onChange={(event) => set("defaultCta", event.target.value)}><option value="book_call">Book a call</option><option value="request_quote">Request a quote</option><option value="free_concept">See a free concept</option><option value="reply">Reply for more information</option><option value="whatsapp">Contact on WhatsApp</option><option value="custom">Custom</option></select></Field>
    <Field label="Brand tone"><Input disabled={!canEdit} value={state.offer.brandTone} onChange={(event) => set("brandTone", event.target.value)} /></Field>
    {state.offer.defaultCta === "custom" ? <div className="sm:col-span-2"><Field label="Custom CTA"><Input disabled={!canEdit} value={state.offer.customCta} onChange={(event) => set("customCta", event.target.value)} /></Field></div> : null}
    <div className="sm:col-span-2"><CsvInput label="Main selling points" value={state.offer.sellingPoints} onChange={(value) => set("sellingPoints", value)} /></div>
  </div></>;
}

function AudienceStep({ state, setState, canEdit, activeIcpId, onSelect, onDuplicate }: { state: OnboardingState; setState: React.Dispatch<React.SetStateAction<OnboardingState>>; canEdit: boolean; activeIcpId: string; onSelect: (id: string) => void; onDuplicate: (id: string) => void }) {
  const selectedIndex = state.icps.findIndex((icp) => icp.id === activeIcpId);
  const activeIndex = Math.max(0, selectedIndex >= 0 ? selectedIndex : state.icps.findIndex((icp) => !icp.archived));
  const icp = state.icps[activeIndex];
  function update<K extends keyof IcpInput>(key: K, value: IcpInput[K]) { setState((current) => ({ ...current, icps: current.icps.map((item, index) => index === activeIndex ? { ...item, [key]: value } : item) })); }
  function addIcp() { const base = state.icps[0]; if (!base) return; const id = crypto.randomUUID(); setState((current) => ({ ...current, icps: [...current.icps, { ...base, id, name: "New audience", isDefault: false, archived: false }] })); onSelect(id); }
  if (!icp) return <div><StepHeading id="step-3-title" eyebrow="Audience" title="Define your ideal customer" description="Create an audience profile without fake prospect counts." /><Button onClick={addIcp}><Plus />Create ICP</Button></div>;
  return <><StepHeading id="step-3-title" eyebrow="Audience" title="Define your ideal customer" description="Combine a plain-language brief with structured criteria. Estimated breadth is directional, never a fake lead count." />
    <div className="mb-6 flex flex-wrap items-center gap-2">{state.icps.map((item) => <button type="button" key={item.id} onClick={() => onSelect(item.id)} className={cn("rounded-full border px-3 py-1.5 text-xs", item.id === icp.id && "border-primary bg-primary/5 text-primary", item.archived && "opacity-50")}>{item.name}{item.isDefault ? " · Default" : ""}</button>)}<Button type="button" size="sm" variant="outline" disabled={!canEdit} onClick={addIcp}><Plus />New</Button><Button type="button" size="sm" variant="outline" disabled={!canEdit} onClick={() => onDuplicate(icp.id)}>Duplicate</Button><Button type="button" size="sm" variant="ghost" disabled={!canEdit} onClick={() => update("archived", true)}><Trash2 />Archive</Button></div>
    <div className="grid gap-5 sm:grid-cols-2">
      <Field label="ICP name"><Input disabled={!canEdit} value={icp.name} onChange={(event) => update("name", event.target.value)} /></Field>
      <Field label="Audience breadth"><select className="h-8 rounded-lg border bg-transparent px-2.5 text-sm" disabled={!canEdit} value={icp.audienceBreadth} onChange={(event) => update("audienceBreadth", event.target.value as IcpInput["audienceBreadth"])}><option value="narrow">Narrow</option><option value="balanced">Balanced</option><option value="broad">Broad</option></select></Field>
      <div className="sm:col-span-2"><Field label="Describe the businesses you want to reach"><Textarea data-testid="icp-description" className="min-h-24" disabled={!canEdit} value={icp.naturalLanguageDescription} onChange={(event) => update("naturalLanguageDescription", event.target.value)} /></Field></div>
      <div className="sm:col-span-2"><Field label="Editable ICP summary"><Textarea disabled={!canEdit} value={icp.summary} onChange={(event) => update("summary", event.target.value)} /><Button type="button" size="sm" variant="outline" className="w-fit" disabled={!canEdit || !icp.naturalLanguageDescription} onClick={() => update("summary", `${icp.naturalLanguageDescription} Focus on ${icp.industries.join(", ") || "relevant industries"} in ${icp.cities.join(", ") || icp.countries.join(", ") || "the selected markets"}.`)}>Draft grounded summary</Button></Field></div>
      <CsvInput label="Countries" value={icp.countries} onChange={(value) => update("countries", value)} /><CsvInput label="Cities" value={icp.cities} onChange={(value) => update("cities", value)} />
      <CsvInput label="Industries" value={icp.industries} onChange={(value) => update("industries", value)} /><CsvInput label="Company sizes" value={icp.companySizes} onChange={(value) => update("companySizes", value)} />
      <Field label="Employee range"><div className="grid grid-cols-2 gap-2"><NumberInput value={icp.employeeMin} onChange={(value) => update("employeeMin", value)} /><NumberInput value={icp.employeeMax} onChange={(value) => update("employeeMax", value)} /></div></Field>
      <Field label="Revenue range"><div className="grid grid-cols-2 gap-2"><NumberInput value={icp.revenueMin} onChange={(value) => update("revenueMin", value)} /><NumberInput value={icp.revenueMax} onChange={(value) => update("revenueMax", value)} /></div></Field>
      <Field label="Business age range (years)"><div className="grid grid-cols-2 gap-2"><NumberInput value={icp.businessAgeMin} onChange={(value) => update("businessAgeMin", value)} /><NumberInput value={icp.businessAgeMax} onChange={(value) => update("businessAgeMax", value)} /></div></Field>
      <Field label="Minimum social activity (0–100)"><NumberInput value={icp.socialActivityMin} min={0} max={100} onChange={(value) => update("socialActivityMin", value)} /></Field>
      <Field label="Minimum review count"><NumberInput value={icp.reviewCountMin} onChange={(value) => update("reviewCountMin", value)} /></Field>
      <CsvInput label="Keywords" value={icp.keywords} onChange={(value) => update("keywords", value)} /><CsvInput label="Excluded industries" value={icp.excludedIndustries} onChange={(value) => update("excludedIndustries", value)} /><CsvInput label="Excluded companies" value={icp.excludedCompanies} onChange={(value) => update("excludedCompanies", value)} />
      <div className="sm:col-span-2"><p className="mb-2 text-sm font-medium">Website opportunity signals</p><div className="grid gap-2 sm:grid-cols-2">{websiteStatuses.map(([value, label]) => <label key={value} className="flex items-center gap-2 rounded-lg border p-3 text-sm"><Checkbox checked={icp.websiteStatuses.includes(value)} onCheckedChange={(checked) => update("websiteStatuses", checked ? [...icp.websiteStatuses, value] : icp.websiteStatuses.filter((item) => item !== value))} />{label}</label>)}</div></div>
      <div className="sm:col-span-2"><p className="mb-2 text-sm font-medium">Required contact methods</p><div className="flex flex-wrap gap-2">{["email", "phone", "instagram", "linkedin", "whatsapp"].map((method) => <label key={method} className="flex items-center gap-2 rounded-lg border px-3 py-2 text-sm capitalize"><Checkbox checked={icp.requiredContactMethods.includes(method)} onCheckedChange={(checked) => update("requiredContactMethods", checked ? [...icp.requiredContactMethods, method] : icp.requiredContactMethods.filter((item) => item !== method))} />{method}</label>)}</div></div>
      <Field label="Minimum lead score"><NumberInput value={icp.minimumScore} min={0} max={100} onChange={(value) => update("minimumScore", value ?? 0)} /></Field>
      <label className="flex items-center gap-2 self-end rounded-lg border p-3 text-sm"><Checkbox checked={icp.isDefault} onCheckedChange={(checked) => update("isDefault", Boolean(checked))} />Use as default ICP</label>
    </div>
  </>;
}

function ChannelsStep({ state, setState, canEdit }: { state: OnboardingState; setState: React.Dispatch<React.SetStateAction<OnboardingState>>; canEdit: boolean }) {
  return <><StepHeading id="step-4-title" eyebrow="Channels" title="Choose where you plan to reach prospects" description="Connection states are honest. Phase 2 stores preferences but never sends a message." /><div className="divide-y rounded-xl border">{state.channels.map((channel) => { const [name, description, capacity] = channelCopy[channel.channel]; return <div key={channel.channel} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center"><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h2 className="font-semibold">{name}</h2><Badge variant="outline" className="capitalize">{channel.state.replaceAll("_", " ")}</Badge></div><p className="mt-1 text-sm text-muted-foreground">{description}</p><p className="mt-1 text-xs text-muted-foreground">{capacity}</p></div><div className="flex items-center gap-3"><Button type="button" size="sm" variant="outline" disabled={channel.channel !== "manual_call"}> {channel.channel === "manual_call" ? "Ready" : "Setup later"}</Button><label className="flex items-center gap-2 text-sm font-medium"><Checkbox disabled={!canEdit} checked={channel.enabled} onCheckedChange={(checked) => setState((current) => ({ ...current, channels: current.channels.map((item) => item.channel === channel.channel ? { ...item, enabled: Boolean(checked) } : item) }))} />Enabled</label></div></div>; })}</div></>;
}

function GoalsStep({ state, setState, canEdit }: { state: OnboardingState; setState: React.Dispatch<React.SetStateAction<OnboardingState>>; canEdit: boolean }) {
  const set = <K extends keyof OnboardingState["goals"]>(key: K, value: OnboardingState["goals"][K]) => setState((current) => ({ ...current, goals: { ...current.goals, [key]: value } }));
  return <><StepHeading id="step-5-title" eyebrow="Goals" title="Set safe campaign defaults" description="These values guide future setup. Billing and sending are not active in Phase 2." /><div className="grid gap-5 sm:grid-cols-2">
    <Field label="Leads needed per month"><input aria-label="Leads per month slider" type="range" min="1" max="2000" value={state.goals.leadsPerMonth} onChange={(event) => set("leadsPerMonth", Number(event.target.value))} /><NumberInput value={state.goals.leadsPerMonth} min={1} max={10000} onChange={(value) => set("leadsPerMonth", value ?? 1)} /></Field>
    <Field label="Messages per day" hint={state.goals.messagesPerDay > 50 ? "This may exceed future plan or provider limits." : undefined}><input aria-label="Messages per day slider" type="range" min="1" max="200" value={state.goals.messagesPerDay} onChange={(event) => set("messagesPerDay", Number(event.target.value))} /><NumberInput value={state.goals.messagesPerDay} min={1} max={1000} onChange={(value) => set("messagesPerDay", value ?? 1)} /></Field>
    <Field label="Sending start"><Input type="time" disabled={!canEdit} value={state.goals.startTime} onChange={(event) => set("startTime", event.target.value)} /></Field><Field label="Sending end"><Input type="time" disabled={!canEdit} value={state.goals.endTime} onChange={(event) => set("endTime", event.target.value)} /></Field>
    <Field label="Primary conversion goal"><Input disabled={!canEdit} value={state.goals.conversionGoal} onChange={(event) => set("conversionGoal", event.target.value)} /></Field><Field label="Workspace timezone"><Input disabled={!canEdit} value={state.goals.timezone} onChange={(event) => set("timezone", event.target.value)} /></Field>
    <Field label="Follow-up count"><NumberInput value={state.goals.followUpCount} min={0} max={10} onChange={(value) => set("followUpCount", value ?? 0)} /></Field><Field label="Minimum lead score"><input aria-label="Minimum score slider" type="range" min="0" max="100" value={state.goals.minimumScore} onChange={(event) => set("minimumScore", Number(event.target.value))} /><NumberInput value={state.goals.minimumScore} min={0} max={100} onChange={(value) => set("minimumScore", value ?? 0)} /></Field>
    <div className="sm:col-span-2"><p className="mb-2 text-sm font-medium">Preferred sending days</p><div className="flex flex-wrap gap-2">{["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day, index) => <label key={day} className="flex items-center gap-2 rounded-lg border px-3 py-2 text-sm"><Checkbox disabled={!canEdit} checked={state.goals.sendingDays.includes(index)} onCheckedChange={(checked) => set("sendingDays", checked ? [...state.goals.sendingDays, index] : state.goals.sendingDays.filter((item) => item !== index))} />{day}</label>)}</div></div>
    <label className="flex items-start gap-3 rounded-lg border p-4 sm:col-span-2"><Checkbox disabled={!canEdit} checked={state.goals.autoReplenish} onCheckedChange={(checked) => set("autoReplenish", Boolean(checked))} /><span><span className="block text-sm font-medium">Automatic lead replenishment</span><span className="text-xs text-muted-foreground">Configuration only. No automatic discovery runs until a later phase.</span></span></label>
  </div></>;
}

function ReviewStep({ state, missing }: { state: OnboardingState; missing: string[] }) {
  return <><StepHeading id="step-6-title" eyebrow="Review" title="Review your workspace setup" description="Nothing sends automatically. You can edit all settings later." /><div className="grid gap-4 sm:grid-cols-2">
    <ReviewCard title="Business" lines={[state.business.companyName, `${state.business.city}, ${state.business.country}`, state.business.description]} />
    <ReviewCard title="Offer" lines={[state.offer.mainService, `${state.offer.currency} ${state.offer.averageProjectValue.toLocaleString()} average value`, state.offer.brandTone]} />
    <ReviewCard title="Audience" lines={[state.icps.find((item) => item.isDefault)?.name || state.icps[0]?.name || "Not configured", state.icps.find((item) => item.isDefault)?.summary || state.icps[0]?.summary || ""]} />
    <ReviewCard title="Channels and limits" lines={[state.channels.filter((item) => item.enabled).map((item) => channelCopy[item.channel][0]).join(", ") || "No enabled channels", `${state.goals.messagesPerDay} messages/day · ${state.goals.leadsPerMonth} leads/month`, `Minimum score ${state.goals.minimumScore}`]} />
    <ReviewCard title="Estimated AI usage" lines={["Website analysis: approximately one structured extraction per import", "Live usage depends on the configured provider and model"]} />
    <ReviewCard title="Recommended plan" lines={[state.goals.leadsPerMonth > 500 ? "Growth plan may fit this volume" : "Start plan may fit this volume", "Plan limits are advisory until billing is active"]} />
  </div>{missing.length ? <div className="mt-5 rounded-lg border border-warning/30 bg-warning/10 p-4"><h2 className="font-semibold">Missing required configuration</h2><ul className="mt-2 list-disc pl-5 text-sm text-muted-foreground">{missing.map((item) => <li key={item}>{item}</li>)}</ul></div> : <div className="mt-5 rounded-lg border border-success/30 bg-success/5 p-4 text-sm font-medium">Your required business context is complete.</div>}</>;
}

function ReviewCard({ title, lines }: { title: string; lines: string[] }) { return <div className="rounded-xl border bg-background p-4"><h2 className="font-semibold">{title}</h2><div className="mt-2 space-y-1 text-sm text-muted-foreground">{lines.filter(Boolean).map((line) => <p key={line} className="line-clamp-3">{line}</p>)}</div></div>; }
