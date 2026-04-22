export interface ParsedQuiz {
    question: string;
    options: [string, string, string, string];
    correct_answer: string;
    explanation: string;
}

export interface TranscriptSegment {
    text: string;
    end: number;
}

export interface TranscriptChunk {
    trigger_time: number;
    text: string;
}

export interface NotificationPayload {
    event: string;
    video_id?: string | number;
    message?: string;
    progress?: number;
    processed_chunks?: number;
    total_chunks?: number;
    saved_count?: number;
    quiz_count?: number;
    duration_minutes?: number;
}

export type UnknownRecord = Record<string, unknown>;