"use client";

import { Button } from "@/components/ui/button";
import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);
  return <main id="main-content" tabIndex={-1} className="grid min-h-dvh place-items-center px-5 outline-none"><section className="max-w-lg text-center"><h1 className="text-3xl font-bold">Something went wrong</h1><p className="mt-3 text-sm leading-6 text-muted-foreground">We couldn’t load this page. Try again, or return in a moment if the problem continues.</p><Button type="button" className="mt-6" onClick={reset}>Try again</Button></section></main>;
}
