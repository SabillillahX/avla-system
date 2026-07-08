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
  is_correct: boolean | null;
  score: string | number | null;
  feedback: string | null;
  created_at: string;
  question: QuestionData;
}

// ─── Friendly label helpers ───────────────────────────────────────────────────

function getStatusLabel(isCorrect: boolean) {
  if (isCorrect) {
    return "Got it! ✓"
  }
  return "Not quite yet"
}

// ─── Stats summary ────────────────────────────────────────────────────────────

function StatsSummary({ assessmentResults, quizResults, activeTab, videoDetails }: {
  assessmentResults: AssessmentResult[];
  quizResults: QuizResult[];
  activeTab: "assessment" | "quiz";
  videoDetails?: any;
}) {
  const isAssessment = activeTab === "assessment"
  const data = isAssessment ? assessmentResults : quizResults
  const total = data.length

  if (isAssessment) {
    const totalScore = assessmentResults.reduce((sum, d) => sum + (d.score !== null && d.score !== undefined ? Number(d.score) : 0), 0)
    const isPending = assessmentResults.some(d => d.score === null || d.score === undefined)
    const passingScore = videoDetails?.passing_score || 0
    const isPassed = !isPending && totalScore >= passingScore

    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-3 sm:p-4 border border-gray-100 dark:border-gray-700 shadow-sm flex flex-col justify-center">
          <p className="text-[10px] sm:text-xs text-gray-500 uppercase tracking-wider mb-1">Total Questions</p>
          <p className="text-xl sm:text-2xl font-semibold text-gray-900 dark:text-white">{total}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-3 sm:p-4 border border-gray-100 dark:border-gray-700 shadow-sm flex flex-col justify-center">
          <div className="flex items-center justify-between mb-1">
            <p className="text-[10px] sm:text-xs text-gray-500 uppercase tracking-wider">Total Score</p>
            {!isPending && (
              <span className={`text-[10px] font-bold uppercase tracking-wider ${isPassed ? 'text-emerald-600' : 'text-red-600'}`}>
                {isPassed ? 'Passed' : 'Needs Improvement'}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <p className="text-xl sm:text-2xl font-semibold text-gray-900 dark:text-white">
              {totalScore} <span className="text-sm font-medium text-gray-400">/ 100</span>
            </p>
            {isPending && <span className="text-[10px] font-bold text-amber-600 uppercase tracking-wider ml-2">Pending Grading</span>}
          </div>
          {!isPending && (
            <p className="text-[10px] sm:text-xs mt-1 font-medium text-gray-500">
              Minimum required: {passingScore}
            </p>
          )}
        </div>
      </div>
    )
  }

  const correct = quizResults.filter(d => d.is_correct).length
  const wrong = total - correct
  const accuracy = total > 0 ? Math.round((correct / total) * 100) : 0

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
      <div className="bg-white dark:bg-gray-800 rounded-xl p-3 sm:p-4 border border-gray-100 dark:border-gray-700 shadow-sm">
        <p className="text-[10px] sm:text-xs text-gray-500 uppercase tracking-wider mb-1">Total</p>
        <p className="text-xl sm:text-2xl font-semibold text-gray-900 dark:text-white">{total}</p>
      </div>
      <div className="bg-white dark:bg-gray-800 rounded-xl p-3 sm:p-4 border border-emerald-100 dark:border-emerald-900/30 shadow-sm">
        <p className="text-[10px] sm:text-xs text-emerald-600 dark:text-emerald-400 uppercase tracking-wider mb-1">Correct</p>
        <p className="text-xl sm:text-2xl font-semibold text-emerald-700 dark:text-emerald-300">{correct}</p>
      </div>
      <div className="bg-white dark:bg-gray-800 rounded-xl p-3 sm:p-4 border border-gray-100 dark:border-gray-700 shadow-sm">
        <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Not yet</p>
        <p className="text-xl sm:text-2xl font-semibold text-gray-700 dark:text-gray-300">{wrong}</p>
      </div>
      <div className="bg-white dark:bg-gray-800 rounded-xl p-3 sm:p-4 border border-gray-100 dark:border-gray-700 shadow-sm">
        <p className="text-[10px] sm:text-xs text-blue-600 dark:text-blue-400 uppercase tracking-wider mb-1">Accuracy</p>
        <p className="text-xl sm:text-2xl font-semibold text-blue-700 dark:text-blue-300">{accuracy}%</p>
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ResultsPage({ params }: { params: { id: string, videoId: string } }) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<"assessment" | "quiz">("assessment")
  const [quizResults, setQuizResults] = useState<QuizResult[]>([])
  const [assessmentResults, setAssessmentResults] = useState<AssessmentResult[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")

  const [videoDetails, setVideoDetails] = useState<any>(null)

  useEffect(() => {
    const fetchResults = async () => {
      try {
        setIsLoading(true)
        const [quizRes, assessmentRes, videoRes] = await Promise.all([
          api.get(`/quiz-results?per_page=50&video_id=${params.videoId}`),
          api.get(`/question-answers?per_page=50&video_id=${params.videoId}`),
          api.get(`/courses/${params.id}/videos/${params.videoId}`)
        ])
        setQuizResults(quizRes.data.data || [])
        setAssessmentResults(assessmentRes.data.data || [])
        setVideoDetails(videoRes.data.data)
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

      {/* Stats */}
      <StatsSummary
        assessmentResults={assessmentResults}
        quizResults={quizResults}
        activeTab={activeTab}
        videoDetails={videoDetails}
      />

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
              <AssessmentResultCard key={`assessment-${result.id}`} result={result} index={index} totalQuestions={assessmentResults.length} />
            ))
        )}

        {activeTab === "quiz" && (
          quizResults.length === 0
            ? <EmptyState message="No pop-up quizzes answered yet. Keep watching!" />
            : quizResults.map((result) => (
              <QuizResultCard key={`quiz-${result.id}`} result={result} />
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

function AssessmentResultCard({ result, index, totalQuestions }: { result: AssessmentResult, index: number, totalQuestions: number }) {
  const { question, user_answer, score, feedback } = result

  const maxScore = totalQuestions > 0 ? Math.floor(100 / totalQuestions) : 0
  const isPending = score === null || score === undefined

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 sm:p-6 border border-gray-100 dark:border-gray-700 shadow-sm transition-shadow hover:shadow-md space-y-5">
      {/* Question Header */}
      <div className="flex gap-4 items-start justify-between">
        <div className="min-w-0 flex-1">
          <h3 className="text-base font-semibold text-gray-900 dark:text-white leading-snug">
            {index + 1}. {question.question}
          </h3>
        </div>

        {/* Score Badge */}
        {!isPending ? (
          <div className="shrink-0 flex items-center justify-center px-3 py-1.5 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white rounded-lg border border-gray-200 dark:border-gray-700 font-bold text-sm">
            {Number(score)} <span className="text-gray-400 font-medium ml-1">/ {maxScore}</span>
          </div>
        ) : (
          <div className="shrink-0 flex items-center justify-center px-3 py-1.5 bg-gray-50 dark:bg-gray-800 text-gray-500 rounded-lg border border-gray-200 dark:border-gray-700 font-medium text-xs uppercase tracking-wider">
            Pending
          </div>
        )}
      </div>

      {/* Answers Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Student Answer */}
        <div className="bg-gray-50 dark:bg-gray-900/50 rounded-xl p-4 border border-gray-100 dark:border-gray-800">
          <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2 block">Your Answer</span>
          <p className="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-line">{user_answer || "—"}</p>
        </div>

        {/* Reference Answer */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 shadow-sm">
          <span className="text-[10px] font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wider mb-2 block">Reference Answer</span>
          <p className="text-sm text-gray-900 dark:text-gray-100 whitespace-pre-line">{question.correct_answer || "—"}</p>
        </div>
      </div>

      {/* Feedback Section */}
      {feedback && (
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 shadow-sm flex gap-3 items-start mt-2">
          <div>
            <span className="text-[10px] font-bold text-gray-700 dark:text-black-500 uppercase tracking-wider mb-1 block">Teacher's Feedback</span>
            <p className="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-line">{feedback}</p>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Quiz card ────────────────────────────────────────────────────────────────

function QuizResultCard({ result }: { result: QuizResult }) {
  const { is_correct, user_answer, quiz } = result
  const statusLabel = getStatusLabel(is_correct)

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
            <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${is_correct
              ? "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
              : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300"
              }`}>
              {statusLabel}
            </span>
            <span className="text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 px-2 py-0.5 rounded-full">
              Multiple choice
            </span>
          </div>
          <p className="text-sm font-medium text-gray-900 dark:text-white leading-snug">{quiz.question}</p>
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


