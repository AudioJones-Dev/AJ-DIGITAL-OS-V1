import { setLocalProviderWarmedUp } from "../model-routing/providers/local-provider-state.js";

const DEFAULT_BOOT_MODEL = "qwen2.5-coder:7b";
const DEFAULT_PRELOAD_URL = "http://host.docker.internal:11434/api/generate";

export async function preloadLocalModel(): Promise<void> {
  if (process.env.LOCAL_PROVIDER_WARMUP_ENABLED !== "true") {
    return;
  }

  const model = process.env.LOCAL_MODEL || DEFAULT_BOOT_MODEL;
  const preloadUrl = process.env.OLLAMA_BASE_URL
    ? `${process.env.OLLAMA_BASE_URL.replace(/\/+$/, "")}/api/generate`
    : DEFAULT_PRELOAD_URL;
  const startMs = Date.now();

  console.log(`[BOOT] Preloading model: ${model}`);

  try {
    const response = await fetch(preloadUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        prompt: "Respond with OK",
        stream: false,
      }),
    });

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      console.warn(`[BOOT] Model preload failed latencyMs=${Date.now() - startMs} status=${response.status} body=${body.slice(0, 200)}`);
      return;
    }

    await response.json().catch(() => null);
    setLocalProviderWarmedUp(true);
    console.log(`[BOOT] Model preload complete latencyMs=${Date.now() - startMs}`);
  } catch (err) {
    console.warn(`[BOOT] Model preload failed latencyMs=${Date.now() - startMs}`, err);
  }
}
