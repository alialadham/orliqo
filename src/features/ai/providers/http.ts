export async function fetchAiWithRetry(input: RequestInfo | URL, init: RequestInit, attempts = 2): Promise<Response> {
  let response: Response | null = null;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    response = await fetch(input, init);
    if (response.status !== 429 && response.status < 500) return response;
    if (attempt < attempts) await new Promise((resolve) => setTimeout(resolve, 250 * attempt));
  }
  return response!;
}
