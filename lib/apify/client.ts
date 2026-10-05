/**
 * Apify REST istemcisi.
 * Token: APIFY_API_TOKEN (.env.local)
 */

const APIFY_BASE_URL = "https://api.apify.com/v2";

export function getApifyToken(): string {
  const token = process.env.APIFY_API_TOKEN?.trim();
  if (!token) {
    throw new Error(
      "APIFY_API_TOKEN eksik. .env.local dosyasına Apify API token ekleyin."
    );
  }
  return token;
}

type StartRunOptions = {
  actorId: string;
  input: Record<string, unknown>;
  timeoutSecs?: number;
};

type ApifyRun = {
  id: string;
  status: string;
  defaultDatasetId?: string;
};

/**
 * Apify actor çalıştırmasını başlatır.
 * actorId örn: "compass/crawler-google-places" → URL'de compass~crawler-google-places
 */
export async function startActorRun({
  actorId,
  input,
  timeoutSecs = 300,
}: StartRunOptions): Promise<ApifyRun> {
  const token = getApifyToken();
  const encodedActorId = actorId.replace("/", "~");
  const url = `${APIFY_BASE_URL}/acts/${encodedActorId}/runs?token=${encodeURIComponent(token)}&timeout=${timeoutSecs}`;

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Apify run başlatılamadı (${response.status}): ${text}`);
  }

  const payload = (await response.json()) as { data: ApifyRun };
  return payload.data;
}

/**
 * Run bitene kadar bekler (polling).
 */
export async function waitForRun(
  runId: string,
  options?: { maxWaitMs?: number; intervalMs?: number }
): Promise<ApifyRun> {
  const token = getApifyToken();
  const maxWaitMs = options?.maxWaitMs ?? 5 * 60 * 1000;
  const intervalMs = options?.intervalMs ?? 5000;
  const startedAt = Date.now();

  while (Date.now() - startedAt < maxWaitMs) {
    const response = await fetch(
      `${APIFY_BASE_URL}/actor-runs/${runId}?token=${encodeURIComponent(token)}`
    );

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Apify run durumu alınamadı: ${text}`);
    }

    const payload = (await response.json()) as { data: ApifyRun };
    const status = payload.data.status;

    if (status === "SUCCEEDED") {
      return payload.data;
    }

    if (
      status === "FAILED" ||
      status === "ABORTED" ||
      status === "TIMED-OUT"
    ) {
      throw new Error(`Apify run başarısız: ${status}`);
    }

    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }

  throw new Error("Apify run zaman aşımına uğradı.");
}

/**
 * Dataset öğelerini getirir.
 */
export async function getDatasetItems<T = Record<string, unknown>>(
  datasetId: string,
  limit = 50
): Promise<T[]> {
  const token = getApifyToken();
  const url = `${APIFY_BASE_URL}/datasets/${datasetId}/items?token=${encodeURIComponent(token)}&clean=true&format=json&limit=${limit}`;

  const response = await fetch(url);
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Apify dataset okunamadı: ${text}`);
  }

  return (await response.json()) as T[];
}

/**
 * Actor'ü çalıştırıp sonuçları döndürür (başlat + bekle + dataset).
 */
export async function runActorAndGetItems<T = Record<string, unknown>>(
  actorId: string,
  input: Record<string, unknown>,
  limit = 50
): Promise<{ runId: string; items: T[] }> {
  const run = await startActorRun({ actorId, input });
  const finished = await waitForRun(run.id);

  if (!finished.defaultDatasetId) {
    throw new Error("Apify run dataset ID döndürmedi.");
  }

  const items = await getDatasetItems<T>(finished.defaultDatasetId, limit);
  return { runId: finished.id, items };
}
