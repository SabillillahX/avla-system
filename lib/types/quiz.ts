export type Quiz = {
  id: string
  trigger_time: number
  question: string
  options: string[]
}

export type QuizResultResponse = {
  message: string
  data: {
    id: string
    user_id: number | string
    quiz_id: string
    user_answer: string
    is_correct: boolean
    quiz: {
      id: string
      question: string
      options: string[]
      correct_answer: string
      explanation: string
    }
    created_at: string
    updated_at: string
  }
}
