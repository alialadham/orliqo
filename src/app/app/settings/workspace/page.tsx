import { OnboardingWizard } from "@/components/onboarding/onboarding-wizard";
import { getOnboardingState, getWebsiteImportHistory } from "@/features/onboarding/data";
import { Badge } from "@/components/ui/badge";
import { hasPermission } from "@/features/permissions/permissions";
import { getWorkspaceContext } from "@/features/workspaces/data";

export default async function WorkspaceSettingsPage() {
  const context = await getWorkspaceContext(); const [state, history] = await Promise.all([getOnboardingState(), getWebsiteImportHistory()]);
  if (!context || !state) return null;
  return <div className="mx-auto max-w-6xl"><div className="mb-5"><p className="text-xs font-semibold uppercase tracking-wider text-primary">Settings</p><h1 className="mt-1 text-3xl font-bold">Business profile</h1><p className="mt-2 text-sm text-muted-foreground">Edit business context, offers, ICPs, channels, and campaign defaults without repeating onboarding.</p></div>{history.length ? <details className="mb-5 rounded-xl border bg-card p-5"><summary className="cursor-pointer font-semibold">Website import history ({history.length})</summary><div className="mt-4 divide-y rounded-lg border">{history.map((item) => <div key={item.id} className="p-4"><div className="flex flex-wrap items-center justify-between gap-2"><div><p className="text-sm font-medium">{item.url}</p><p className="text-xs text-muted-foreground">{item.provider} · {item.model} · {new Date(item.createdAt).toLocaleString()}</p></div><Badge variant="outline" className="capitalize">{item.status}</Badge></div><div className="mt-3 grid gap-2 sm:grid-cols-2">{item.suggestions.map((suggestion) => <div key={`${item.id}-${suggestion.field}`} className="rounded-lg bg-muted/40 p-2 text-xs"><span className="font-semibold">{suggestion.field}</span><span className="ml-2 text-muted-foreground">{suggestion.value}</span><span className="ml-2 capitalize text-primary">{suggestion.decision}</span></div>)}</div></div>)}</div></details> : null}<div className="overflow-hidden rounded-xl border bg-card"><OnboardingWizard initialState={state} canEdit={hasPermission(context.activeWorkspace.role, "settings:manage")} embedded /></div></div>;
}
