"use client"

/**
 * NotificationContext
 *
 * Owns the single long-lived SSE connection to the MCP notification server.
 * Because this context lives at the app root (above DashboardLayout), the
 * EventSource is never torn down during client-side page navigations —
 * eliminating the "disconnect window" that caused buffered events to be lost.
 *
 * DashboardLayout (and any other component) subscribes to AI process state
 * via the exposed context value instead of managing the connection itself.
 */

import React, {
    createContext,
    useContext,
    useEffect,
    useRef,
    useState,
    useCallback,
} from "react"
import { useAuth } from "@/contexts/AuthContext"
import { Client } from "@modelcontextprotocol/sdk/client/index.js"
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type AiProcessState = "idle" | "connecting" | "generating" | "success" | "error"

export interface NotificationContextValue {
    aiProcessState: AiProcessState
    aiProgress: number
    aiStatusMessage: string
    aiProcessingVideoId: string | null
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

const NotificationContext = createContext<NotificationContextValue>({
    aiProcessState: "idle",
    aiProgress: 0,
    aiStatusMessage: "",
    aiProcessingVideoId: null,
})

export function useNotification(): NotificationContextValue {
    return useContext(NotificationContext)
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MCP_SERVER_URL = "http://localhost:8081"
const MCP_MAX_CONNECT_ATTEMPTS = 4
const SSE_HEARTBEAT_TIMEOUT_MS = 45_000   // treat as dead if no heartbeat within 45 s
const STALE_PROCESS_TIMEOUT_MS = 60_000   // abort if no progress update within 60 s

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export function NotificationProvider({ children }: { children: React.ReactNode }) {
    const { user } = useAuth()

    const [aiProcessState, setAiProcessState] = useState<AiProcessState>("idle")
    const [aiProgress, setAiProgress] = useState(0)
    const [aiStatusMessage, setAiStatusMessage] = useState("")
    const [aiProcessingVideoId, setAiProcessingVideoId] = useState<string | null>(null)

    // Refs for timers & connection objects — safe to mutate without re-renders.
    const eventSourceRef = useRef<EventSource | null>(null)
    const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
    const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
    const staleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
    const heartbeatTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
    const isUnmountedRef = useRef(false)
    const reconnectAttemptsRef = useRef(0)
    const activeJobVideoIdRef = useRef<string | null>(null)
    const aiProcessStateRef = useRef<AiProcessState>("idle")

    // Keep ref in sync so SSE callbacks always read the latest state.
    useEffect(() => {
        aiProcessStateRef.current = aiProcessState
    }, [aiProcessState])

    // ---------------------------------------------------------------------------
    // Timer helpers
    // ---------------------------------------------------------------------------

    const clearTimer = (ref: React.MutableRefObject<ReturnType<typeof setTimeout> | null>) => {
        if (ref.current) { clearTimeout(ref.current); ref.current = null }
    }

    const scheduleAutoHide = useCallback((delayMs: number) => {
        clearTimer(hideTimerRef)
        hideTimerRef.current = setTimeout(() => {
            setAiProcessState("idle")
            setAiProgress(0)
            setAiStatusMessage("")
            setAiProcessingVideoId(null)
        }, delayMs)
    }, [])

    const armStaleProtection = useCallback(() => {
        clearTimer(staleTimerRef)
        staleTimerRef.current = setTimeout(() => {
            setAiProcessState("error")
            setAiStatusMessage("Proses AI terlalu lama tanpa update. Silakan coba lagi.")
            scheduleAutoHide(4_000)
        }, STALE_PROCESS_TIMEOUT_MS)
    }, [scheduleAutoHide])

    const resetHeartbeatTimer = useCallback(() => {
        clearTimer(heartbeatTimerRef)
        heartbeatTimerRef.current = setTimeout(() => {
            // No heartbeat received — close and let the reconnect logic re-open.
            console.warn("[Notifications] Heartbeat timeout — forcing reconnect.")
            eventSourceRef.current?.close()
            eventSourceRef.current = null
            if (!isUnmountedRef.current) connectSse() // eslint-disable-line @typescript-eslint/no-use-before-define
        }, SSE_HEARTBEAT_TIMEOUT_MS)
    }, []) // connectSse added below via ref to avoid circular dep

    // ---------------------------------------------------------------------------
    // MCP tool invocation
    // ---------------------------------------------------------------------------

    const runMcpWithRetry = useCallback(async (params: {
        token: string
        videoId: string | number
        userId: string | number
    }) => {
        const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))
        let lastError: unknown = null

        for (let attempt = 1; attempt <= MCP_MAX_CONNECT_ATTEMPTS; attempt++) {
            let mcpClient: Client | null = null
            try {
                setAiProcessState("connecting")
                setAiStatusMessage(`Menghubungkan ke MCP (${attempt}/${MCP_MAX_CONNECT_ATTEMPTS})...`)
                setAiProgress(Math.min(15, 5 + attempt * 2))

                const transport = new SSEClientTransport(new URL(`${MCP_SERVER_URL}/sse`))
                mcpClient = new Client({ name: "nextjs-ondemand", version: "1.0.0" }, { capabilities: {} })
                await mcpClient.connect(transport)

                setAiProcessState("generating")
                setAiStatusMessage("Terhubung. AI sedang menyiapkan kuis...")
                armStaleProtection()

                await Promise.all([
                    // mcpClient.callTool({
                    //     name: "generateAdaptiveVideoQuizzes",
                    //     arguments: {
                    //         token: params.token,
                    //         userId: params.userId,
                    //         videoId: params.videoId,
                    //         intervalMinutes: 3,
                    //     },
                    // }),
                    mcpClient.callTool({
                        name: "generateFullAssessment",
                        arguments: {
                            token: params.token,
                            userId: params.userId,
                            videoId: params.videoId,
                            parallelWithQuiz: true,
                        },
                    })
                ])

                return // success
            } catch (error) {
                lastError = error
                const message = error instanceof Error ? error.message : "Unknown error"
                console.error(`[MCP] Attempt ${attempt} failed: ${message}`)

                if (attempt < MCP_MAX_CONNECT_ATTEMPTS) {
                    const retryDelayMs = Math.min(8_000, attempt * 2_000)
                    setAiStatusMessage(`Koneksi MCP gagal. Mencoba ulang dalam ${retryDelayMs / 1_000}s...`)
                    await wait(retryDelayMs)
                }
            } finally {
                mcpClient?.close()
            }
        }

        throw lastError instanceof Error
            ? lastError
            : new Error("Gagal terhubung ke MCP setelah beberapa percobaan.")
    }, [armStaleProtection])

    // ---------------------------------------------------------------------------
    // SSE connection
    // ---------------------------------------------------------------------------

    const connectSse = useCallback(() => {
        if (isUnmountedRef.current || !user?.id) return

        eventSourceRef.current?.close()

        const eventSource = new EventSource(`${MCP_SERVER_URL}/notifications?userId=${user.id}`)
        eventSourceRef.current = eventSource

        eventSource.onopen = () => {
            reconnectAttemptsRef.current = 0
            clearTimer(reconnectTimerRef)
            resetHeartbeatTimer()
            console.log("[Notifications] SSE connected.")
        }

        eventSource.addEventListener("ping", () => {
            resetHeartbeatTimer();
        });

        eventSource.onerror = () => {
            if (isUnmountedRef.current) return

            // Don't stack multiple reconnect timers.
            if (reconnectTimerRef.current) return

            reconnectAttemptsRef.current += 1
            const delayMs = Math.min(10_000, 1_000 * reconnectAttemptsRef.current)
            console.warn(`[Notifications] SSE error — reconnect in ${delayMs}ms`)

            reconnectTimerRef.current = setTimeout(() => {
                reconnectTimerRef.current = null
                connectSse()
            }, delayMs)

            if (
                aiProcessStateRef.current === "connecting" ||
                aiProcessStateRef.current === "generating"
            ) {
                setAiStatusMessage("Koneksi notifikasi terputus. Menyambung ulang...")
            }
        }

        eventSource.onmessage = async (event: MessageEvent) => {
            // Any message (including heartbeat comments) resets the dead-connection timer.
            resetHeartbeatTimer()

            if (!event.data || event.data.trim() === "{}" || event.data.trim() === "") return;

            let data: Record<string, unknown>
            try {
                data = JSON.parse(event.data)
            } catch {
                console.error("[Notifications] Failed to parse SSE message:", event.data)
                return
            }

            console.log("[Notifications] Received:", data)

            switch (data.event) {
                case "quiz_generation_started":
                case "assessment_generation_started": {
                    clearTimer(hideTimerRef)
                    setAiProcessState("generating")
                    setAiProgress((data.progress as number) ?? (data.assessment_progress as number) ?? 0)
                    setAiStatusMessage((data.message as string) || "Memulai pembuatan...")
                    if (data.video_id) setAiProcessingVideoId(String(data.video_id))
                    armStaleProtection()
                    break
                }

                case "quiz_generation_progress":
                case "quiz_generation_saving":
                case "assessment_generation_analyzing":
                case "assessment_generation_progress":
                case "assessment_generation_saving": {
                    clearTimer(hideTimerRef)
                    setAiProcessState("generating")
                    setAiProgress((data.progress as number) ?? (data.assessment_progress as number) ?? 0)
                    setAiStatusMessage((data.message as string) || "AI sedang memproses...")
                    armStaleProtection()
                    break
                }

                case "quiz_generation_completed":
                case "assessment_generation_completed": {
                    clearTimer(staleTimerRef)
                    setAiProcessState("success")
                    setAiProgress(100)
                    setAiStatusMessage((data.message as string) || "Selesai!")

                    // Notify the video player to reload quizzes/assessments
                    if (data.video_id) {
                        window.dispatchEvent(
                            new CustomEvent("aiContentReady", {
                                detail: { videoId: String(data.video_id), type: data.event },
                            })
                        )
                    }

                    scheduleAutoHide(3_000)
                    break
                }

                case "quiz_generation_failed":
                case "assessment_generation_failed": {
                    clearTimer(staleTimerRef)
                    setAiProcessState("error")
                    setAiStatusMessage((data.message as string) || "Gagal membuat konten.")
                    scheduleAutoHide(4_000)
                    break
                }

                case "transcription_ready": {
                    const incomingVideoId = String(data.video_id)

                    // Deduplicate — ignore if we are already handling this video.
                    if (activeJobVideoIdRef.current === incomingVideoId) {
                        console.log(`[Notifications] Duplicate transcription_ready for video ${incomingVideoId} — ignored.`)
                        break
                    }

                    activeJobVideoIdRef.current = incomingVideoId
                    setAiProcessingVideoId(incomingVideoId)
                    console.log(`[Notifications] Transcription ready: videoId=${incomingVideoId}`)

                    clearTimer(hideTimerRef)
                    setAiProcessState("connecting")
                    setAiProgress(5)
                    setAiStatusMessage("Transkrip selesai. Menghubungkan ke AI...")
                    armStaleProtection()

                    window.dispatchEvent(new CustomEvent("videoListRefresh"))

                    const token = localStorage.getItem("auth_token")
                    if (!token) {
                        clearTimer(staleTimerRef)
                        setAiProcessState("error")
                        setAiStatusMessage("Token login tidak ditemukan.")
                        scheduleAutoHide(3_000)
                        activeJobVideoIdRef.current = null
                        break
                    }

                    try {
                        await runMcpWithRetry({ token, userId: user.id, videoId: incomingVideoId })
                    } catch (error) {
                        clearTimer(staleTimerRef)
                        setAiProcessState("error")
                        setAiStatusMessage("Gagal terhubung ke MCP setelah beberapa percobaan.")
                        console.error("[MCP] Final error:", error)
                        scheduleAutoHide(3_000)
                    } finally {
                        activeJobVideoIdRef.current = null
                    }
                    break
                }

                case "video_status_changed": {
                    const videoId = String(data.video_id)
                    const newStatus = String(data.status ?? "")
                    console.log(`[Notifications] Video status changed: videoId=${videoId}, status=${newStatus}`)

                    // Dispatch a granular event so the video list can update in-place
                    window.dispatchEvent(
                        new CustomEvent("videoStatusChanged", {
                            detail: { videoId, status: newStatus },
                        })
                    )
                    break
                }

                default:
                    break
            }
        }
    }, [user?.id, armStaleProtection, resetHeartbeatTimer, runMcpWithRetry, scheduleAutoHide])

    // ---------------------------------------------------------------------------
    // Lifecycle — connect once when user is available, disconnect on unmount.
    // ---------------------------------------------------------------------------

    useEffect(() => {
        if (!user?.id) return

        isUnmountedRef.current = false
        connectSse()

        return () => {
            isUnmountedRef.current = true
            clearTimer(hideTimerRef)
            clearTimer(staleTimerRef)
            clearTimer(reconnectTimerRef)
            clearTimer(heartbeatTimerRef)
            eventSourceRef.current?.close()
            eventSourceRef.current = null
            console.log("[Notifications] SSE connection closed (unmount).")
        }
    }, [user?.id, connectSse])

    return (
        <NotificationContext.Provider value={{ aiProcessState, aiProgress, aiStatusMessage, aiProcessingVideoId }}>
            {children}
        </NotificationContext.Provider>
    )
}