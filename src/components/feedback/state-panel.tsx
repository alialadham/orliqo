import { AlertTriangle, Ban, CircleOff, CloudOff, LockKeyhole, SearchX } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";

const icons = {
  error: AlertTriangle,
  empty: CircleOff,
  permission: LockKeyhole,
  plan: Ban,
  offline: CloudOff,
  missing: SearchX,
} as const;

export function StatePanel({
  variant,
  title,
  description,
  action,
}: {
  variant: keyof typeof icons;
  title: string;
  description: string;
  action?: { label: string; href: string };
}) {
  const Icon = icons[variant];
  return (
    <section className="mx-auto flex min-h-[50vh] max-w-xl flex-col items-center justify-center px-6 text-center">
      <span className="mb-5 grid size-12 place-items-center rounded-full border bg-card">
        <Icon className="size-5 text-muted-foreground" aria-hidden="true" />
      </span>
      <h1 className="text-2xl font-bold">{title}</h1>
      <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">{description}</p>
      {action ? (
        <Button asChild className="mt-6">
          <Link href={action.href}>{action.label}</Link>
        </Button>
      ) : null}
    </section>
  );
}
