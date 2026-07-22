# AI Providers

Website extraction uses a common server-only adapter contract:

1. `AI_PRIMARY_PROVIDER`
2. comma-separated `AI_FALLBACK_PROVIDERS`
3. deterministic `mock` fallback

Supported adapters are Gemini, Groq, and OpenRouter. Each adapter exposes connection
testing and structured business extraction, records provider/model/prompt version
and token usage when returned, uses bounded timeouts/retries, and validates output
with Zod.

```text
AI_PRIMARY_PROVIDER=gemini
AI_FALLBACK_PROVIDERS=groq,openrouter
GEMINI_API_KEY=
GEMINI_MODEL=
GROQ_API_KEY=
GROQ_MODEL=
OPENROUTER_API_KEY=
OPENROUTER_MODEL=
AI_PROMPT_VERSION=website-import-v1
```

Keys must never use `NEXT_PUBLIC_`. Blank keys keep demo/mock behavior active. A
provider is not considered live until its server-side test succeeds.

The mock fallback only returns claims present in the supplied page text. Unknown
fields stay omitted from review instead of being invented from the hostname.
