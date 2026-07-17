const SAFE_APP_PATH = /^\/(app(?:\/[^?#]*)?|onboarding|reset-password)(?:[?#].*)?$/;

export function safeRedirectPath(value: string | null | undefined): string {
  if (!value || !SAFE_APP_PATH.test(value) || value.startsWith("//")) {
    return "/app/dashboard";
  }

  return value;
}
