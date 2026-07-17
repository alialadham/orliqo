import {
  CalendarDays,
  ChartNoAxesCombined,
  CircleHelp,
  CreditCard,
  Database,
  FileText,
  House,
  Mail,
  Plug,
  Search,
  Send,
  Settings,
  UserRound,
} from "lucide-react";

export const APP_ROUTES = [
  { label: "Dashboard", href: "/app/dashboard", icon: House },
  { label: "Campaigns", href: "/app/campaigns", icon: Send },
  { label: "Leads", href: "/app/leads", icon: UserRound },
  { label: "Discovery", href: "/app/discovery", icon: Search },
  { label: "Outreach Queue", href: "/app/queue", icon: Database },
  { label: "Inbox", href: "/app/inbox", icon: Mail, badge: 3 },
  { label: "Calendar", href: "/app/calendar", icon: CalendarDays },
  { label: "Analytics", href: "/app/analytics", icon: ChartNoAxesCombined },
  { label: "Templates", href: "/app/templates", icon: FileText },
  { label: "Integrations", href: "/app/integrations", icon: Plug },
  { label: "Billing", href: "/app/billing", icon: CreditCard },
  { label: "Settings", href: "/app/settings/workspace", icon: Settings },
] as const;

export const MOBILE_PRIMARY_ROUTES = APP_ROUTES.filter(({ label }) =>
  ["Dashboard", "Campaigns", "Leads", "Inbox"].includes(label),
);

export const MOBILE_MORE_ROUTES = APP_ROUTES.filter(({ label }) =>
  ["Discovery", "Outreach Queue", "Calendar", "Analytics", "Templates", "Integrations", "Billing", "Settings"].includes(label),
);

export const HELP_ROUTE = { label: "Help & support", href: "mailto:support@orliqo.com", icon: CircleHelp } as const;
