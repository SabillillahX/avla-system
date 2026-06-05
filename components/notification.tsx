"use client"

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
import { AiProcessState, NotificationContextValue } from "@/lib/types/notification"

const NotificationContext = createContext<NotificationContextValue>({
    aiProcessState: "idle",
    aiProgress: 0,
    aiStatusMessage: "",
    aiProcessingVideoId: null,
})

export function useNotification(): NotificationContextValue {
    return useContext(NotificationContext)
}

const MCP_SERVER_URL = process.env.NEXT_PUBLIC_MCP_SERVER_URL
const MCP_MAX_CONNECT_ATTEMPTS = 4
const SSE_HEARTBEAT_TIMEOUT_MS = 180_000
const STALE_PROCESS_TIMEOUT_MS = 60_000

export function NotificationProvider({ children }: { children: React.ReactNode }) {
    const { user } = useAuth()

    const [aiProcessState, setAiProcessState] = useState<AiProcessState>("idle")
    const [aiProgress, setAiProgress] = useState(0)
    const [aiStatusMessage, setAiStatusMessage] = useState("")
    const [aiProcessingVideoId, setAiProcessingVideoId] = useState<string | null>(null)

    // Refs for timers & connection objects — safe to mutate without re-renders.
    const eventSourceRef = useRef<EventSource | null>(null)
    const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
    const staleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
    const isUnmountedRef = useRef(false)
    const activeJobVideoIdRef = useRef<string | null>(null)
    const aiProcessStateRef = useRef<AiProcessState>("idle")

    useEffect(() => {
        aiProcessStateRef.current = aiProcessState
    }, [aiProcessState])

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



    const runMcpWithRetry = useCallback(async (params: {
        token: string
        videoId: string | number
        userId: string | number
    }) => {
        if (!MCP_SERVER_URL) {
            throw new Error("MCP server URL is not configured")
        }
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

                const results = await Promise.allSettled([
                    mcpClient.callTool({
                        name: "generateAdaptiveVideoQuizzes",
                        arguments: {
                            token: params.token,
                            userId: params.userId,
                            videoId: params.videoId,
                            intervalMinutes: 3,
                        },
                    }, undefined, { timeout: 120_000 }),
                    mcpClient.callTool({
                        name: "generateFullAssessment",
                        arguments: {
                            token: params.token,
                            userId: params.userId,
                            videoId: params.videoId,
                            parallelWithQuiz: true,
                        },
                    }, undefined, { timeout: 180_000 })
                ])

                const allFailed = results.every(r => r.status === 'rejected')
                if (allFailed) {
                    throw new Error("Semua task AI gagal dieksekusi (timeout/disconnect).")
                }

                return
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

    const connectSse = useCallback(() => {
        if (!MCP_SERVER_URL) return
        if (isUnmountedRef.current || !user?.id) return

        // Mencegah koneksi ganda jika sudah ada instance (sesuai saran yang benar)
        if (eventSourceRef.current) return

        console.log("[Notifications] Menginisialisasi koneksi global...")
        const eventSource = new EventSource(`${MCP_SERVER_URL}/notifications?userId=${user.id}`)
        eventSourceRef.current = eventSource

        eventSource.onopen = () => {
            console.log("[Notifications] SSE connected.")
        }

        eventSource.onerror = (error) => {
            console.error("[Notifications] SSE error/terputus. EventSource akan mencoba reconnect otomatis.", error)
        }

        eventSource.onmessage = async (event: MessageEvent) => {
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
    }, [user?.id, armStaleProtection, runMcpWithRetry, scheduleAutoHide])

    useEffect(() => {
        if (!MCP_SERVER_URL) return
        if (!user?.id) return

        isUnmountedRef.current = false
        connectSse()

        return () => {
            isUnmountedRef.current = true
            clearTimer(hideTimerRef)
            clearTimer(staleTimerRef)
            if (eventSourceRef.current) {
                // Tepat di sini! Tambahkan log warna merahnya
                console.log("🚨 REACT MENGHANCURKAN KOMPONEN (UNMOUNT)! KONEKSI SSE DIPUTUS SECARA PAKSA OLEH FRONTEND!");

                eventSourceRef.current.close()
                eventSourceRef.current = null
                console.log("[Notifications] SSE connection closed (unmount).")
            }
        }
    }, [user?.id, connectSse])

    return (
        <NotificationContext.Provider value={{ aiProcessState, aiProgress, aiStatusMessage, aiProcessingVideoId }}>
            {children}
        </NotificationContext.Provider>
    )
}