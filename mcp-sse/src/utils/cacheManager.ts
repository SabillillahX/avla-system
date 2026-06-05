import { TranscriptSegment } from "./interface.js";
import { ENV } from "./helper.js";

export interface TranscriptContext {
    isCached: boolean;
    cacheName?: string;
    rawText?: string;
    expiresAt: number;
}

const transcriptStore = new Map<string, TranscriptContext>();
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function estimateTokens(text: string): number {
    return Math.ceil(text.length / 4);
}

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
                const response = await fetch(`${ENV.backendUrl}/videos/${videoId}/transcript`, {
                    method: "GET",
                    headers: {
                        "Content-Type": "application/json",
                        "Accept": "application/json",
                        "Authorization": `Bearer ${token}`,
                    },
                });

                // Jika 401, tunggu sebentar lalu retry (memberi waktu Laravel sinkronisasi token)
                if (response.status === 401) {
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
    const tokenCount = estimateTokens(fullTranscript);

    // 4. Gemini Context Caching API
    if (tokenCount >= 32768) {
        try {
            const url = `https://generativelanguage.googleapis.com/v1beta/cachedContents?key=${ENV.geminiApiKey}`;
            const res = await fetch(url, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    model: "models/gemini-1.5-flash",
                    contents: [{ parts: [{ text: fullTranscript }] }],
                    ttl: "3600s",
                }),
            });

            if (res.ok) {
                const data = await res.json();
                const context = {
                    isCached: true,
                    cacheName: data.name,
                    expiresAt: Date.now() + 55 * 60 * 1000
                };
                transcriptStore.set(videoId, context);
                return context;
            }
        } catch (error) {
            console.warn(`[Cache API] Background caching failed, fallback to memory.`);
        }
    }

    // 5. In-memory fallback
    const context = {
        isCached: false,
        rawText: fullTranscript,
        expiresAt: Date.now() + 60 * 60 * 1000
    };
    transcriptStore.set(videoId, context);
    return context;
}