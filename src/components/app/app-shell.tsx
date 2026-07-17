import { DemoNotice } from "@/components/feedback/demo-notice";
import { DesktopSidebar } from "@/components/app/desktop-sidebar";
import { MobileNavigation } from "@/components/app/mobile-navigation";
import { DesktopTopBar, MobileHeader } from "@/components/app/top-bar";
import { DEMO_SEARCH_RECORDS } from "@/features/demo/data";
import type { WorkspaceContext } from "@/features/workspaces/types";

export function AppShell({ context, children }: { context: WorkspaceContext; children: React.ReactNode }) {
  const searchRecords = context.isDemo ? DEMO_SEARCH_RECORDS : [];
  return (
    <div className="min-h-dvh bg-background lg:pl-[228px]">
      <DesktopSidebar context={context} />
      <div className="min-h-dvh">
        <DesktopTopBar context={context} searchRecords={searchRecords} />
        <MobileHeader context={context} searchRecords={searchRecords} />
        {context.isDemo ? <DemoNotice className="rounded-none border-x-0 border-t-0" /> : null}
        <main className="min-h-[calc(100dvh-104px)] px-4 pt-6 pb-28 sm:px-5 lg:min-h-[calc(100dvh-104px)] lg:px-7 lg:pt-6 lg:pb-8">{children}</main>
        <MobileNavigation context={context} />
      </div>
    </div>
  );
}
