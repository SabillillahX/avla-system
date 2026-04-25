export interface ParsedQuiz {
    question: string;
    options: [string, string, string, string];
    correct_answer: string;
    explanation: string;
}

export interface AssessmentQuestion {
    type: 'multiple_choice' | 'short_answer' | 'essay';
    difficulty_level: number;
    question: string;
    options: string[] | null;
    correct_answers: string[];
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
    status?: string;
    processed_chunks?: number;
    total_chunks?: number;
    saved_count?: number;
    quiz_count?: number;
    duration_minutes?: number;
    assessment_progress?: number;
    assessment_status?: string;
    assessment_saved_count?: number;
}

export type UnknownRecord = Record<string, unknown>;