import "@fontsource-variable/inter";
import "@fontsource-variable/manrope";
import "@fontsource/ibm-plex-sans-arabic/400.css";
import "@fontsource/ibm-plex-sans-arabic/600.css";
import "./globals.css";

import type { Metadata, Viewport } from "next";
import { connection } from "next/server";

import { OfflineBanner } from "@/components/feedback/offline-banner";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"),
  title: {
    default: "Orliqo | AI-powered B2B outreach",
    template: "%s | Orliqo",
  },
  description:
    "Discover relevant prospects, personalize responsible outreach, manage replies, and understand campaign performance with Orliqo.",
  applicationName: "Orliqo",
  creator: "Orliqo",
  publisher: "Orliqo",
  category: "business",
  icons: {
    icon: [{ url: "/brand/orliqo-mark.png", type: "image/png", sizes: "1254x1254" }],
    shortcut: "/brand/orliqo-mark.png",
    apple: [{ url: "/brand/orliqo-mark.png", sizes: "1254x1254", type: "image/png" }],
  },
  manifest: "/manifest.webmanifest",
  openGraph: {
    type: "website",
    siteName: "Orliqo",
    title: "Orliqo | AI-powered B2B outreach",
    description: "Discover relevant prospects, create personalized outreach, manage replies, and understand performance.",
    images: [{ url: "/brand/orliqo-mark.png", width: 1254, height: 1254, alt: "Orliqo" }],
  },
  twitter: {
    card: "summary",
    title: "Orliqo | AI-powered B2B outreach",
    description: "Discover relevant prospects, create personalized outreach, manage replies, and understand performance.",
    images: ["/brand/orliqo-mark.png"],
  },
};

export const viewport: Viewport = {
  colorScheme: "light",
  themeColor: "#101114",
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  // A nonce CSP requires every document to render for its incoming request.
  await connection();

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
