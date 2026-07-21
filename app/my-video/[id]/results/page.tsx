"use client"

import { useState, useEffect, useCallback } from "react"
import { ArrowLeft, CheckCircle2, XCircle, Loader2, BookOpen, AlertCircle, Lightbulb, Sparkles } from "lucide-react"
import { useRouter } from "next/navigation"
import api from "@/lib/api/axios"
import { Shimmer } from "@/lib/components/ui/shimmer"
import { toast } from "sonner"

interface QuizData {
  question: string;
  correct_answer: string;
}

interface QuizResult {
  id: number;
  user_answer: string;
  is_correct: boolean;
  created_at: string;
  quiz: QuizData;
}

interface QuestionData {
  type: string;
  question: string;
  correct_answer: string;
}

interface AssessmentResult {
  id: number;
  user_answer: string;
  is_correct: boolean;
  created_at: string;
  question: QuestionData;
  ai_feedback_suggestion?: string;
}

export default function ResultsPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<"assessment" | "quiz">("assessment")
  const [quizResults, setQuizResults] = useState<QuizResult[]>([])
  const [assessmentResults, setAssessmentResults] = useState<AssessmentResult[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")
  const [isEvaluating, setIsEvaluating] = useState(false)
  const [feedbackJustArrived, setFeedbackJustArrived] = useState(false)

  useEffect(() => {
    let toastId: string | number;
    const hasEvaluableQuestions = assessmentResults.some(
      r => r.question?.type === "essay" || r.question?.type === "short_answer"
    );

    if (isEvaluating && hasEvaluableQuestions) {
      toastId = toast("AI sedang mengevaluasi jawaban Anda...", {
        duration: 100000,
        style: {
          backgroundColor: 'white',
          color: '#1e3a8a',
          border: '1px solid #e2e8f0',
        }
      });
    }

    return () => {
      if (toastId) toast.dismiss(toastId);
    };
  }, [isEvaluating, assessmentResults]);

  const fetchAssessmentResults = useCallback(async () => {
    const assessmentRes = await api.get(`/question-answers?per_page=50&video_id=${params.id}`)
    return assessmentRes.data.data || []
  }, [params.id])

  useEffect(() => {
    const fetchResults = async () => {
      try {
        setIsLoading(true)
        const [quizRes, assessmentData] = await Promise.all([
          api.get(`/quiz-results?per_page=50&video_id=${params.id}`),
          fetchAssessmentResults()
        ])
        setQuizResults(quizRes.data.data || [])
        setAssessmentResults(assessmentData)

        const hasEssayOrShortAnswer = assessmentData.some(
          (r: AssessmentResult) => r.question?.type === "essay" || r.question?.type === "short_answer"
        )
        const allHaveFeedback = assessmentData
          .filter((r: AssessmentResult) => r.question?.type === "essay" || r.question?.type === "short_answer")
          .every((r: AssessmentResult) => !!r.ai_feedback_suggestion)

        if (hasEssayOrShortAnswer && !allHaveFeedback) {
          setIsEvaluating(true)
        }
      } catch (err: any) {
        console.error("Failed to fetch results", err)
        setError("Couldn't load your results. Try refreshing the page.")
      } finally {
        setIsLoading(false)
      }
    }
    fetchResults()
  }, [params.id, fetchAssessmentResults])

  useEffect(() => {
    const handleEvaluationStarted = (e: Event) => {
      const detail = (e as CustomEvent).detail
      if (detail.videoId === params.id) {
        setIsEvaluating(true)
      }
    }

    const handleEvaluationCompleted = async (e: Event) => {
      const detail = (e as CustomEvent).detail
      if (detail.videoId === params.id) {
        const freshData = await fetchAssessmentResults()
        setAssessmentResults(freshData)
        setIsEvaluating(false)
        setFeedbackJustArrived(true)
        setTimeout(() => setFeedbackJustArrived(false), 2000)
      }
    }

    const handleEvaluationFailed = (e: Event) => {
      const detail = (e as CustomEvent).detail
      if (detail.videoId === params.id) {
        setIsEvaluating(false)
      }
    }

    window.addEventListener("evaluationStarted", handleEvaluationStarted)
    window.addEventListener("evaluationCompleted", handleEvaluationCompleted)
    window.addEventListener("evaluationFailed", handleEvaluationFailed)

    return () => {
      window.removeEventListener("evaluationStarted", handleEvaluationStarted)
      window.removeEventListener("evaluationCompleted", handleEvaluationCompleted)
      window.removeEventListener("evaluationFailed", handleEvaluationFailed)
    }
  }, [params.id, fetchAssessmentResults])

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3 text-gray-400">
        <Loader2 className="w-7 h-7 animate-spin" />
        <span className="text-sm">Loading your results...</span>
      </div>
    )
  }

  const hasEvaluableQuestions = assessmentResults.some(
    r => r.question?.type === "essay" || r.question?.type === "short_answer"
  )

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-5xl mx-auto min-h-screen">

      <div className="flex items-center gap-3 mb-7">
        <button
          onClick={() => router.back()}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white">Your learning recap</h1>
          <p className="text-gray-400 dark:text-gray-500 text-sm">Here's how it went — no stress, just growth</p>
        </div>
      </div>

      {error && (
        <div className="mb-5 p-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-xl flex items-center gap-3 text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <p>{error}</p>
        </div>
      )}

      <div className="flex border-b border-gray-100 dark:border-gray-800 mb-6">
        {(["assessment", "quiz"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-5 py-2.5 text-sm font-medium border-b-2 transition-all -mb-px ${activeTab === tab
              ? "border-blue-500 text-blue-600 dark:border-blue-400 dark:text-blue-400"
              : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
              }`}
          >
            {tab === "assessment" ? "Assessment" : "Quiz (Pop-up Video)"}
          </button>
        ))}
      </div>

      <div className="space-y-4">
        {activeTab === "assessment" && (
          assessmentResults.length === 0
            ? <EmptyState message="No assessments yet — jump in and give one a try!" />
            : assessmentResults.map((result, index) => (
              <AssessmentResultCard
                key={`assessment-${result.id}`}
                result={result}
                index={index + 1}
                isEvaluating={isEvaluating}
                feedbackJustArrived={feedbackJustArrived}
              />
            ))
        )}

        {activeTab === "quiz" && (
          quizResults.length === 0
            ? <EmptyState message="No pop-up quizzes answered yet. Keep watching!" />
            : quizResults.map((result, index) => (
              <QuizResultCard key={`quiz-${result.id}`} result={result} index={index + 1} />
            ))
        )}
      </div>
    </div>
  )
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="text-center py-14 rounded-2xl border border-dashed border-gray-200 dark:border-gray-700">
      <BookOpen className="w-10 h-10 mx-auto text-gray-300 dark:text-gray-600 mb-3" />
      <p className="text-gray-500 dark:text-gray-400 text-sm">{message}</p>
    </div>
  )
}

function FeedbackSkeleton() {
  return (
    <div className="mt-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4 border border-gray-100 dark:border-gray-700/50 flex gap-3">
      <Shimmer className="w-5 h-5 bg-gray-200 dark:bg-gray-700 rounded flex-shrink-0 mt-0.5" />
      <div className="flex-1 space-y-2">
        <Shimmer className="h-2.5 bg-gray-200 dark:bg-gray-700 rounded w-20" />
        <Shimmer className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-full" />
        <Shimmer className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-4/5" />
        <Shimmer className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-3/5" />
      </div>
    </div>
  )
}

function AssessmentResultCard({
  result,
  index,
  isEvaluating,
  feedbackJustArrived,
}: {
  result: AssessmentResult;
  index: number;
  isEvaluating: boolean;
  feedbackJustArrived: boolean;
}) {
  const { question, user_answer, ai_feedback_suggestion } = result
  const isEvaluableType = question.type === "essay" || question.type === "short_answer"
  const showSkeleton = isEvaluableType && isEvaluating && !ai_feedback_suggestion

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 sm:p-5 border border-gray-100 dark:border-gray-700 shadow-sm transition-shadow hover:shadow-md">

      <div className="flex items-start gap-3 mb-4">
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <span className="text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 px-2 py-0.5 rounded-full capitalize">
              {question.type.replace("_", " ")}
            </span>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-sm font-medium text-black dark:text-gray-400">{index}.</span>
            <p className="text-sm font-medium text-gray-900 dark:text-white leading-snug">{question.question}</p>
          </div>
        </div>
      </div>

      <div className="ml-0 sm:ml-8 mt-4 sm:mt-0 space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="bg-gray-50 dark:bg-gray-900/40 rounded-xl p-3 border border-gray-100 dark:border-gray-700/50">
            <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider block mb-1">You said</span>
            <p className="text-sm text-gray-800 dark:text-gray-200">{user_answer || "—"}</p>
          </div>
          <div className="bg-gray-50 dark:bg-gray-900/40 rounded-xl p-3 border border-gray-100 dark:border-gray-700/50">
            <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider block mb-1">Correct answer</span>
            <p className="text-sm text-gray-800 dark:text-gray-200">{question.correct_answer || "—"}</p>
          </div>
        </div>

        {showSkeleton && <FeedbackSkeleton />}

        {ai_feedback_suggestion && (
          <div
            className={`mt-4 pt-4 border-t border-gray-100 dark:border-gray-700/50 transition-all duration-500 ${feedbackJustArrived ? "animate-fadeIn" : ""}`}
          >
            <span className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wider block mb-2">AI Feedback</span>
            <p className="text-sm text-gray-800 dark:text-gray-200 leading-relaxed whitespace-pre-wrap mb-3">{ai_feedback_suggestion}</p>
            <p className="text-[10px] sm:text-[11px] leading-relaxed text-gray-400/90 dark:text-gray-500 italic">
              Feedback ini dihasilkan oleh AI sebagai referensi pembelajaran dan bukan merupakan penilaian mutlak.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

function QuizResultCard({ result, index }: { result: QuizResult, index: number }) {
  const { is_correct, user_answer, quiz } = result

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 sm:p-5 border border-gray-100 dark:border-gray-700 shadow-sm transition-shadow hover:shadow-md">

      <div className="flex items-start gap-3 mb-4">
        <div className="mt-0.5 flex-shrink-0">
          {is_correct
            ? <CheckCircle2 className="w-5 h-5 text-blue-500" />
            : <XCircle className="w-5 h-5 text-gray-400" />
          }
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <span className="text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 px-2 py-0.5 rounded-full">
              Multiple choice
            </span>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-sm font-medium text-gray-500 dark:text-gray-400">{index}.</span>
            <p className="text-sm font-medium text-gray-900 dark:text-white leading-snug">{quiz.question}</p>
          </div>
        </div>
      </div>

      <div className="ml-0 sm:ml-8 mt-4 sm:mt-0 space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="bg-gray-50 dark:bg-gray-900/40 rounded-xl p-3 border border-gray-100 dark:border-gray-700/50">
            <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider block mb-1">You said</span>
            <p className="text-sm text-gray-800 dark:text-gray-200">{user_answer || "—"}</p>
          </div>
          <div className="bg-blue-50/60 dark:bg-blue-900/10 rounded-xl p-3 border border-blue-100 dark:border-blue-900/30">
            <span className="text-[10px] font-semibold text-blue-500 uppercase tracking-wider block mb-1">Correct answer</span>
            <p className="text-sm text-gray-800 dark:text-gray-200">{quiz.correct_answer}</p>
          </div>
        </div>
      </div>
    </div>
  )
}
