export type AiProcessState = "idle" | "connecting" | "generating" | "success" | "error"

export interface NotificationContextValue {
    aiProcessState: AiProcessState
    aiProgress: number
    aiStatusMessage: string
    aiProcessingVideoId: string | null
}