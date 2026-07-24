"use client";

import { WifiOff } from "lucide-react";
import { useEffect, useState } from "react";

export function OfflineBanner() {
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    const update = () => setOffline(!navigator.onLine);
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);

  if (!offline) return null;

  return (
    <div
      role="status"
      className="fixed inset-x-0 top-0 z-[100] flex min-h-10 items-center justify-center gap-2 bg-warning px-4 text-sm font-semibold text-black"
    >
      <WifiOff className="size-4" aria-hidden="true" />
      You are offline. Saved data remains visible; reconnect before retrying actions.
    </div>
  );
}
