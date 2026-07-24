import "@fontsource-variable/inter";
import "@fontsource-variable/manrope";
import "@fontsource/ibm-plex-sans-arabic/400.css";
import "@fontsource/ibm-plex-sans-arabic/600.css";
import "./globals.css";

import type { Metadata, Viewport } from "next";

import { OfflineBanner } from "@/components/feedback/offline-banner";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";

export const metadata: Metadata = {
  title: {
    default: "Orliqo | Evidence-backed outreach",
    template: "%s | Orliqo",
  },
  description:
    "Discover qualified businesses, review grounded outreach, and send safely through authorized providers.",
  applicationName: "Orliqo",
};

export const viewport: Viewport = {
  colorScheme: "light",
  themeColor: "#101114",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <a
          href="#main-content"
          className="sr-only z-[200] rounded-md bg-background px-4 py-2 font-semibold focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:ring-2 focus:ring-ring"
        >
          Skip to main content
        </a>
        <TooltipProvider delayDuration={250}>
          <OfflineBanner />
          {children}
          <Toaster position="top-center" richColors closeButton />
        </TooltipProvider>
      </body>
    </html>
  );
}
