export type QuestionType = "multiple_choice" | "short_answer" | "essay"

export interface AssessmentQuestion {
  uuid: string
  video_id: string
  type: QuestionType
  question: string
  options: string[] | null
  explanation: string
  has_answered: boolean
  accepted_answers?: string[]
  created_at: string
  updated_at: string
}

export interface AssessmentQuestionsResponse {
  data: AssessmentQuestion[]
}

export interface SubmitAnswerPayload {
  question_id: string
  user_answer: string
}

export interface SubmitAnswerResponse {
  message: string
  data: {
    id: number
    user_id: number | string
    question_uuid: string
    user_answer: string
    is_correct: boolean
    question: AssessmentQuestion
    created_at: string
    updated_at: string
  }
}
