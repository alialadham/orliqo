"use client";

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";

export default function RootGlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);
  return (
    <html lang="en">
      <body>
        <main
          id="main-content"
          className="grid min-h-dvh place-items-center px-5"
        >
          <section className="max-w-lg text-center">
            <h1 className="text-3xl font-bold">Orliqo is temporarily unavailable</h1>
            <p className="mt-3 text-sm leading-6">
              We couldn’t load Orliqo. Please try again in a moment.
            </p>
            <button
              type="button"
              className="mt-6 rounded-lg bg-black px-4 py-2 text-white"
              onClick={reset}
            >
              Try again
            </button>
          </section>
        </main>
      </body>
    </html>
  );
}
