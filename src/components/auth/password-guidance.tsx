"use client";

import { Check } from "lucide-react";

import { PASSWORD_MIN_LENGTH, isCommonPassword } from "@/features/auth/schemas";
import { cn } from "@/lib/utils";

export function PasswordGuidance({ password }: { password: string }) {
  const lengthReady = password.length >= PASSWORD_MIN_LENGTH;
  const uncommon = password.length > 0 && !isCommonPassword(password);
  const variety = [/[a-z]/, /[A-Z]/, /\d/, /[^A-Za-z0-9]/].filter((rule) =>
    rule.test(password),
  ).length;
  const score = Math.min(
    4,
    (password.length >= 8 ? 1 : 0) +
      (lengthReady ? 1 : 0) +
      (password.length >= 20 ? 1 : 0) +
      (variety >= 3 ? 1 : 0),
  );
  const labels = ["Very weak", "Weak", "Fair", "Good", "Strong"];

  return (
    <div className="space-y-2" aria-live="polite">
      <div
        className="grid grid-cols-4 gap-1"
        role="progressbar"
        aria-label={`Password strength: ${labels[score]}`}
        aria-valuemin={0}
        aria-valuemax={4}
        aria-valuenow={score}
      >
        {Array.from({ length: 4 }, (_, index) => (
          <span
            key={index}
            className={cn(
              "h-1.5 rounded-full bg-muted transition-colors duration-200",
              index < score && score < 3 && "bg-warning",
              index < score && score >= 3 && "bg-success",
            )}
          />
        ))}
      </div>
      <p className="text-xs font-medium text-muted-foreground">{labels[score]}</p>
      <ul className="grid gap-1 text-xs text-muted-foreground sm:grid-cols-2">
        <Requirement met={lengthReady}>At least {PASSWORD_MIN_LENGTH} characters</Requirement>
        <Requirement met={uncommon}>Not a common password</Requirement>
      </ul>
    </div>
  );
}

function Requirement({ met, children }: { met: boolean; children: React.ReactNode }) {
  return (
    <li className={cn("flex items-center gap-1.5", met && "text-success")}>
      <span className="grid size-4 place-items-center rounded-full border" aria-hidden="true">
        {met ? <Check className="size-3" /> : null}
      </span>
      {children}
    </li>
  );
}
