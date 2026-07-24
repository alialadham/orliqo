import { DemoNotice } from "@/components/feedback/demo-notice";
import { DesktopSidebar } from "@/components/app/desktop-sidebar";
import { MobileNavigation } from "@/components/app/mobile-navigation";
import { DesktopTopBar, MobileHeader } from "@/components/app/top-bar";
import type { SearchRecord } from "@/components/app/global-search";
import type { WorkspaceContext } from "@/features/workspaces/types";
import type { NotificationSummary } from "@/features/notifications/data";
import { ObservabilityIdentity } from "@/components/app/observability-identity";

export function AppShell({ context, searchRecords, notifications, children }: { context: WorkspaceContext; searchRecords: readonly SearchRecord[]; notifications: readonly NotificationSummary[]; children: React.ReactNode }) {
  return (
    <div className="min-h-dvh overflow-x-hidden bg-background lg:pl-[228px]">
      <ObservabilityIdentity userId={context.user.id} workspaceId={context.activeWorkspace.id} enabled={!context.isDemo} />
      <DesktopSidebar context={context} notificationCount={notifications.length} />
      <div className="min-h-dvh">
        <DesktopTopBar context={context} searchRecords={searchRecords} notifications={notifications} />
        <MobileHeader context={context} searchRecords={searchRecords} notifications={notifications} />
        {context.isDemo ? <DemoNotice className="rounded-none border-x-0 border-t-0" /> : null}
        <main id="main-content" tabIndex={-1} className="min-h-[calc(100dvh-104px)] min-w-0 overflow-x-hidden px-4 pt-6 pb-28 outline-none sm:px-5 lg:min-h-[calc(100dvh-104px)] lg:px-7 lg:pt-6 lg:pb-8">{children}</main>
        <MobileNavigation context={context} notificationCount={notifications.length} />
      </div>
    </div>
  );
}
