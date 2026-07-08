export interface VideoWithCompletion {
  id: string
  title: string
  description?: string | null
  thumbnail_path?: string | null
  status?: string
  quiz_count: number
  assessment_count: number
  quiz_done_count: number
  quiz_correct_count?: number
  assessment_done_count: number
  is_quiz_done: boolean
  is_assessment_done: boolean
  is_assessment_pending?: boolean
  is_assessment_passed?: boolean
  assessment_total_score?: number
  is_completed: boolean
}
