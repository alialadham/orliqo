export async function fetchAiWithRetry(
  input: RequestInfo | URL,
  init: RequestInit,
  attempts = 2,
  timeoutMs = 20_000,
): Promise<Response> {
  let response: Response | null = null;
  let failure: unknown;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      response = await fetch(input, {
        ...init,
        signal: init.signal
          ? AbortSignal.any([init.signal, AbortSignal.timeout(timeoutMs)])
          : AbortSignal.timeout(timeoutMs),
      });
      if (response.status !== 429 && response.status < 500) return response;
    } catch (error) {
      failure = error;
    }
    if (attempt < attempts)
      await new Promise((resolve) => setTimeout(resolve, 250 * attempt));
  }
  if (response) return response;
  throw failure instanceof Error
    ? failure
    : new Error("AI provider request failed.");
}
