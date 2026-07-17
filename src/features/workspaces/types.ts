import type { WorkspaceRole } from "@/features/permissions/permissions";

export type WorkspaceSummary = {
  id: string;
  name: string;
  slug: string;
  role: WorkspaceRole;
  plan: "starter" | "growth" | "agency" | "trial" | "none";
  credits: number;
};

export type WorkspaceContext = {
  user: {
    id: string;
    email: string;
    fullName: string;
    initials: string;
  };
  activeWorkspace: WorkspaceSummary;
  workspaces: readonly WorkspaceSummary[];
  isDemo: boolean;
  onboardingComplete: boolean;
};
