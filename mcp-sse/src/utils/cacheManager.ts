import { TranscriptSegment } from "./interface.js";
import { ENV } from "./helper.js";

export interface TranscriptContext {
    isCached: boolean;
    cacheName?: string;
    rawText?: string;
    expiresAt: number;
}

// In-memory store (Key: videoId)
const transcriptStore = new Map<string, TranscriptContext>();

// Helper to estimate tokens (1 token ~= 4 characters in English/Indonesian)
function estimateTokens(text: string): number {
    return Math.ceil(text.length / 4);
}

// Add this signature update to handle background fetching
export async function getOrLoadTranscriptContext(
    videoId: string, 
    token: string, // Needed to fetch from Laravel if segments aren't passed yet
    transcriptSegments?: TranscriptSegment[]
): Promise<TranscriptContext> {
    const existing = transcriptStore.get(videoId);
    if (existing && existing.expiresAt > Date.now()) {
        return existing; 
    }

    let segments = transcriptSegments;

    // If no segments were passed, go fetch them from the Laravel backend
    if (!segments) {
        console.log(`[Cache-Preloader] Fetching transcript from backend for video ${videoId}...`);
        const response = await fetch(`${ENV.backendUrl}/videos/${videoId}/transcript`, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                Accept: "application/json",
                Authorization: `Bearer ${token}`,
            },
        });

        if (!response.ok) {
            throw new Error(`Failed to fetch transcript for preloading: HTTP ${response.status}`);
        }

        const body = await response.json();
        segments = body.data ?? [];
    }

    if (!segments || segments.length === 0) {
        throw new Error("Transcript segments are empty. Cannot cache.");
    }

    const fullTranscript = segments.map(seg => seg.text).join(" ").trim();
    const tokenCount = estimateTokens(fullTranscript);
    
    // Gemini Context Caching API (>32k tokens)
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
                console.log(`[Cache API] Preloaded & Cached large video context: ${videoId}`);
                return context;
            }
        } catch (error) {
            console.warn(`[Cache API] Background caching failed for ${videoId}, falling back to raw text.`);
        }
    }

    // In-memory fallback for shorter videos
    const context = {
        isCached: false,
        rawText: fullTranscript,
        expiresAt: Date.now() + 60 * 60 * 1000 
    };
    transcriptStore.set(videoId, context);
    console.log(`[Cache Memory] Preloaded short video into memory: ${videoId} (~${tokenCount} tokens)`);
    return context;
}
    

