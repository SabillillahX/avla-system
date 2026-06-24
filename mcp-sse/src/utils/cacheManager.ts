import { TranscriptSegment } from "./interface.js";
import { ENV, fetchWithAuth } from "./helper.js";

export interface TranscriptContext {
    rawText?: string;
    expiresAt: number;
}

const transcriptStore = new Map<string, TranscriptContext>();
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function getOrLoadTranscriptContext(
    videoId: string,
    token: string,
    transcriptSegments?: TranscriptSegment[]
): Promise<TranscriptContext> {
    // 1. Cek Cache Memory
    const existing = transcriptStore.get(videoId);
    if (existing && existing.expiresAt > Date.now()) {
        return existing;
    }

    let segments = transcriptSegments;

    // 2. Jika tidak ada, fetch dari Laravel dengan Retry Logic (menangani 401 Race Condition)
    if (!segments) {
        let lastError = null;
        const maxRetries = 3;

        for (let i = 0; i < maxRetries; i++) {
            try {
                console.log(`[Cache-Preloader] Fetching video ${videoId} (Attempt ${i + 1})...`);
                const cleanToken = token.replace(/^["']|["']$/g, '').trim();

                const url = `${ENV.backendUrl.replace(/\/+$/, '')}/videos/${videoId}/transcript`;

                // fetchWithAuth follows redirects manually so the Authorization
                // header is preserved across an http→https / trailing-slash hop.
                const response = await fetchWithAuth(url, {
                    method: "GET",
                    headers: {
                        "Content-Type": "application/json",
                        "Accept": "application/json",
                        "Authorization": `Bearer ${cleanToken}`,
                    },
                });

                // Jika 401, tunggu sebentar lalu retry (memberi waktu Laravel sinkronisasi token)
                if (response.status === 401) {
                    const errBody = await response.text();
                    console.error(`[Cache-Preloader] 401 Unauthorized from backend. Body:`, errBody, `Token used:`, cleanToken);
                    throw new Error("401");
                }

                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${await response.text()}`);
                }

                const body = await response.json();
                segments = body.data ?? [];
                break; // Berhasil, keluar dari loop
            } catch (err: any) {
                lastError = err;
                if (err.message === "401" && i < maxRetries - 1) {
                    await sleep(1500); // Tunggu 1.5 detik untuk retry
                    continue;
                }
                throw err;
            }
        }
    }

    if (!segments || segments.length === 0) {
        throw new Error("Transcript segments are empty. Cannot cache.");
    }

    // 3. Proses Transkrip
    const fullTranscript = segments.map(seg => seg.text).join(" ").trim();

    // 4. In-memory fallback
    const context = {
        rawText: fullTranscript,
        expiresAt: Date.now() + 60 * 60 * 1000
    };
    transcriptStore.set(videoId, context);
    return context;
}