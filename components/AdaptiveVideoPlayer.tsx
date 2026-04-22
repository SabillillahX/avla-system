"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import type { Quiz, QuizResultResponse } from "@/lib/types/quiz"

type AdaptiveVideoPlayerProps = {
  videoId: string
  videoSrc: string
  apiBaseUrl?: string
  accessToken?: string
  className?: string
}

const defaultHeaders = (accessToken?: string): Record<string, string> => {
  const headers: Record<string, string> = {
    Accept: "application/json",
  }

  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`
  }

  return headers
}

export default function AdaptiveVideoPlayer({
  videoId,
  videoSrc,
  apiBaseUrl = "",
  accessToken,
  className,
}: AdaptiveVideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const shownQuizIdsRef = useRef<Set<string>>(new Set())

  const [quizzes, setQuizzes] = useState<Quiz[]>([])
  const [quizzesLoading, setQuizzesLoading] = useState(true)
  const [quizzesError, setQuizzesError] = useState<string | null>(null)

  const [isQuizOpen, setIsQuizOpen] = useState(false)
  const [activeQuizId, setActiveQuizId] = useState<string | null>(null)
  const [selectedOption, setSelectedOption] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<{
    isCorrect: boolean
    correctAnswer: string
    explanation: string
  } | null>(null)

  const activeQuiz = useMemo(
    () => quizzes.find((quiz) => quiz.id === activeQuizId) || null,
    [activeQuizId, quizzes]
  )

  const resetQuizState = useCallback(() => {
    setSelectedOption(null)
    setIsSubmitting(false)
    setSubmitError(null)
    setFeedback(null)
  }, [])

  useEffect(() => {
    let isMounted = true
    const controller = new AbortController()

    const fetchQuizzes = async () => {
      try {
        setQuizzesLoading(true)
        setQuizzesError(null)
        setIsQuizOpen(false)
        setActiveQuizId(null)
        resetQuizState()
        shownQuizIdsRef.current = new Set()

        const response = await fetch(
          `${apiBaseUrl}/videos/${videoId}/quizzes`,
          {
            method: "GET",
            headers: defaultHeaders(accessToken),
            credentials: accessToken ? "omit" : "include",
            signal: controller.signal,
          }
        )

        if (!response.ok) {
          throw new Error("Gagal mengambil data kuis")
        }

        const payload = (await response.json()) as { data: Quiz[] }
        const sorted = [...payload.data].sort(
          (a, b) => a.trigger_time - b.trigger_time
        )
        if (isMounted) setQuizzes(sorted)
      } catch (error) {
        if (isMounted) {
          setQuizzesError(
            error instanceof Error ? error.message : "Gagal mengambil data kuis"
          )
        }
      } finally {
        if (isMounted) setQuizzesLoading(false)
      }
    }

    fetchQuizzes()

    return () => {
      isMounted = false
      controller.abort()
    }
  }, [accessToken, apiBaseUrl, resetQuizState, videoId])

  const handleTimeUpdate = useCallback(() => {
    const videoEl = videoRef.current
    if (!videoEl || isQuizOpen || quizzes.length === 0) return

    const currentSecond = Math.floor(videoEl.currentTime)
    const nextQuiz = quizzes.find(
      (quiz) =>
        !shownQuizIdsRef.current.has(quiz.id) &&
        currentSecond >= quiz.trigger_time
    )

    if (!nextQuiz) return

    shownQuizIdsRef.current.add(nextQuiz.id)
    setActiveQuizId(nextQuiz.id)
    setIsQuizOpen(true)
    resetQuizState()
    videoEl.pause()
  }, [isQuizOpen, quizzes, resetQuizState])

  const handleSubmit = useCallback(async () => {
    if (!activeQuiz || !selectedOption) return

    setIsSubmitting(true)
    setSubmitError(null)

    try {
      const response = await fetch(`${apiBaseUrl}/quiz-results`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...defaultHeaders(accessToken),
        },
        credentials: accessToken ? "omit" : "include",
        body: JSON.stringify({
          quiz_id: activeQuiz.id,
          user_answer: selectedOption,
        }),
      })

      if (!response.ok) {
        throw new Error("Gagal mengirim jawaban")
      }

      const payload = (await response.json()) as QuizResultResponse
      setFeedback({
        isCorrect: payload.data.is_correct,
        correctAnswer: payload.data.quiz.correct_answer,
        explanation: payload.data.quiz.explanation,
      })
    } catch (error) {
      setSubmitError(
        error instanceof Error ? error.message : "Gagal mengirim jawaban"
      )
    } finally {
      setIsSubmitting(false)
    }
  }, [accessToken, activeQuiz, apiBaseUrl, selectedOption])

  const handleContinue = useCallback(() => {
    setIsQuizOpen(false)
    setActiveQuizId(null)
    resetQuizState()
    videoRef.current?.play()
  }, [resetQuizState])

  return (
    <div className={className}>
      <div className="relative w-full aspect-video rounded-2xl overflow-hidden bg-black shadow-2xl">
        <video
          ref={videoRef}
          src={videoSrc}
          className="w-full h-full object-contain"
          controls
          onTimeUpdate={handleTimeUpdate}
        />

        {isQuizOpen && activeQuiz && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="w-full max-w-xl rounded-2xl border border-gray-200/70 bg-white/95 p-5 shadow-2xl dark:border-gray-700 dark:bg-gray-900/95">
              <div>
                <h2 className="text-base font-semibold text-gray-900 dark:text-white">
                  {activeQuiz.question}
                </h2>
              </div>

              <div className="mt-5 grid gap-3">
                {activeQuiz.options.map((option) => {
                  const isSelected = selectedOption === option
                  const isCorrect = feedback && option === feedback.correctAnswer
                  const isWrong = feedback && isSelected && option !== feedback.correctAnswer

                  return (
                    <button
                      key={option}
                      type="button"
                      onClick={() => setSelectedOption(option)}
                      className={`w-full rounded-xl border px-3 py-2.5 text-left text-sm transition-all focus:outline-none focus:ring-2 focus:ring-blue-500/60 ${
                        isCorrect
                          ? "border-emerald-400 bg-emerald-50 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-200"
                          : isWrong
                            ? "border-red-400 bg-red-50 text-red-800 dark:bg-red-900/30 dark:text-red-200"
                            : isSelected
                              ? "border-blue-400 bg-blue-50 text-blue-900 dark:bg-blue-900/30 dark:text-blue-100"
                              : "border-gray-200 bg-white/80 text-gray-800 hover:border-blue-300 dark:border-gray-700 dark:bg-gray-900/60 dark:text-gray-200"
                      }`}
                    >
                      {option}
                    </button>
                  )
                })}
              </div>

              {submitError && (
                <p className="mt-4 text-xs text-red-500">{submitError}</p>
              )}

              {feedback && (
                <div className="mt-4 rounded-xl border border-gray-100 bg-gray-50/80 p-3 text-xs text-gray-600 dark:border-gray-700 dark:bg-gray-800/70 dark:text-gray-300">
                  <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">
                    {feedback.isCorrect ? "Jawaban benar" : "Jawaban kurang tepat"}
                  </p>
                  <p className="mt-2 leading-relaxed">{feedback.explanation}</p>
                </div>
              )}

              <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {quizzesLoading
                    ? "Memuat kuis..."
                    : quizzesError
                      ? quizzesError
                      : `${shownQuizIdsRef.current.size} dari ${quizzes.length} kuis`}
                </span>
                {feedback ? (
                  <Button onClick={handleContinue} className="h-9 px-5">
                    Lanjutkan Video
                  </Button>
                ) : (
                  <Button
                    onClick={handleSubmit}
                    disabled={!selectedOption || isSubmitting}
                    className="h-9 px-5"
                  >
                    {isSubmitting ? "Mengirim..." : "Submit"}
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
