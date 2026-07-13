"use client"

import { useState, useEffect } from "react"
import { ArrowLeft, CheckCircle2, XCircle, Loader2, BookOpen, AlertCircle, MessageCircle, Lightbulb } from "lucide-react"
import { useRouter } from "next/navigation"
import api from "@/lib/api/axios"

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
}


// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ResultsPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<"assessment" | "quiz">("assessment")
  const [quizResults, setQuizResults] = useState<QuizResult[]>([])
  const [assessmentResults, setAssessmentResults] = useState<AssessmentResult[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    const fetchResults = async () => {
      try {
        setIsLoading(true)
        const [quizRes, assessmentRes] = await Promise.all([
          api.get(`/quiz-results?per_page=50&video_id=${params.id}`),
          api.get(`/question-answers?per_page=50&video_id=${params.id}`)
        ])
        setQuizResults(quizRes.data.data || [])
        setAssessmentResults(assessmentRes.data.data || [])
      } catch (err: any) {
        console.error("Failed to fetch results", err)
        setError("Couldn't load your results. Try refreshing the page.")
      } finally {
        setIsLoading(false)
      }
    }
    fetchResults()
  }, [])

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3 text-gray-400">
        <Loader2 className="w-7 h-7 animate-spin" />
        <span className="text-sm">Loading your results...</span>
      </div>
    )
  }

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-5xl mx-auto min-h-screen">

      {/* Header */}
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


      {/* Tabs */}
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

      {/* Cards */}
      <div className="space-y-4">
        {activeTab === "assessment" && (
          assessmentResults.length === 0
            ? <EmptyState message="No assessments yet — jump in and give one a try!" />
            : assessmentResults.map((result, index) => (
              <AssessmentResultCard key={`assessment-${result.id}`} result={result} index={index + 1} />
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

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyState({ message }: { message: string }) {
  return (
    <div className="text-center py-14 rounded-2xl border border-dashed border-gray-200 dark:border-gray-700">
      <BookOpen className="w-10 h-10 mx-auto text-gray-300 dark:text-gray-600 mb-3" />
      <p className="text-gray-500 dark:text-gray-400 text-sm">{message}</p>
    </div>
  )
}

// ─── Assessment card ──────────────────────────────────────────────────────────

function AssessmentResultCard({ result, index }: { result: AssessmentResult, index: number }) {
  const { is_correct, question, user_answer } = result

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 sm:p-5 border border-gray-100 dark:border-gray-700 shadow-sm transition-shadow hover:shadow-md">

      {/* Top row */}
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

      {/* Answers */}
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
      </div>
    </div>
  )
}

// ─── Quiz card ────────────────────────────────────────────────────────────────

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


