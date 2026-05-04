"use client"

import { useState, useEffect } from "react"
import { ArrowLeft, CheckCircle2, XCircle, Loader2, BookOpen, AlertCircle, Sparkles } from "lucide-react"
import { useRouter } from "next/navigation"
import api from "@/lib/api/axios"

interface QuizData {
  question: string;
  correct_answer: string;
  explanation: string;
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
  accepted_answers: string[];
  explanation: string;
}

interface AssessmentResult {
  id: number;
  user_answer: string;
  is_correct: boolean;
  score: number;
  ai_feedback: string | null;
  created_at: string;
  question: QuestionData;
}

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
        setError("Failed to load learning results.")
      } finally {
        setIsLoading(false)
      }
    }

    fetchResults()
  }, [])

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return new Intl.DateTimeFormat('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date)
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3 text-gray-400">
        <Loader2 className="w-8 h-8 animate-spin" />
        <span>Loading...</span>
      </div>
    )
  }

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-5xl mx-auto min-h-screen">
      <div className="flex items-center gap-4 mb-8">
        <button
          onClick={() => router.back()}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Learning Results</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm">Review your quiz and assessment history</p>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 text-red-600 rounded-lg flex items-center gap-3">
          <AlertCircle className="w-5 h-5" />
          <p>{error}</p>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 p-1 bg-gray-100 dark:bg-gray-800 rounded-xl mb-8 w-fit">
        <button
          onClick={() => setActiveTab("assessment")}
          className={`px-6 py-2.5 rounded-lg text-sm font-medium transition-all ${activeTab === "assessment"
            ? "bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm"
            : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
            }`}
        >
          Assessment
        </button>
        <button
          onClick={() => setActiveTab("quiz")}
          className={`px-6 py-2.5 rounded-lg text-sm font-medium transition-all ${activeTab === "quiz"
            ? "bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm"
            : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
            }`}
        >
          Quiz (Pop-up Video)
        </button>
      </div>

      {/* Content */}
      <div className="space-y-6">
        {activeTab === "assessment" && (
          <>
            {assessmentResults.length === 0 ? (
              <div className="text-center py-12 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-gray-100 dark:border-gray-800">
                <BookOpen className="w-12 h-12 mx-auto text-gray-300 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">Empty assessment results</h3>
                <p className="text-gray-500">You have not completed any assessments yet.</p>
              </div>
            ) : (
              assessmentResults.map((result) => (
                <AssessmentResultCard
                  key={`assessment-${result.id}`}
                  isCorrect={result.is_correct}
                  score={result.score ?? 0}
                  question={result.question.question}
                  userAnswer={result.user_answer}
                  correctAnswer={result.question.accepted_answers?.[0] || "-"}
                  aiFeedback={result.ai_feedback}
                  explanation={result.question.explanation}
                  type={result.question.type}
                />
              ))
            )}
          </>
        )}

        {activeTab === "quiz" && (
          <>
            {quizResults.length === 0 ? (
              <div className="text-center py-12 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-gray-100 dark:border-gray-800">
                <BookOpen className="w-12 h-12 mx-auto text-gray-300 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">Empty quiz results</h3>
                <p className="text-gray-500">You have not answered any pop-up quizzes yet.</p>
              </div>
            ) : (
              quizResults.map((result) => (
                <QuizResultCard
                  key={`quiz-${result.id}`}
                  isCorrect={result.is_correct}
                  question={result.quiz.question}
                  userAnswer={result.user_answer}
                  correctAnswer={result.quiz.correct_answer}
                  explanation={result.quiz.explanation}
                />
              ))
            )}
          </>
        )}
      </div>
    </div>
  )
}

function AssessmentResultCard({
  isCorrect,
  score,
  question,
  userAnswer,
  correctAnswer,
  aiFeedback,
  explanation,
  type
}: {
  isCorrect: boolean;
  score: number;
  question: string;
  userAnswer: string;
  correctAnswer: string;
  aiFeedback: string | null;
  explanation: string;
  type: string;
}) {
  const scoreColor = score >= 70
    ? "text-emerald-700 bg-emerald-50 border-emerald-200 dark:text-emerald-300 dark:bg-emerald-900/30 dark:border-emerald-800"
    : score >= 40
      ? "text-amber-700 bg-amber-50 border-amber-200 dark:text-amber-300 dark:bg-amber-900/30 dark:border-amber-800"
      : "text-red-700 bg-red-50 border-red-200 dark:text-red-300 dark:bg-red-900/30 dark:border-red-800"

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
      <div className="flex flex-col sm:flex-row justify-between sm:items-start gap-4 mb-4">
        <div className="flex items-start gap-3">
          <div className="mt-1">
            {isCorrect ? (
              <CheckCircle2 className="w-6 h-6 text-emerald-500" />
            ) : (
              <XCircle className="w-6 h-6 text-red-500" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className={`text-sm font-semibold px-2.5 py-0.5 rounded ${isCorrect
                ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300"
                : "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300"
                }`}>
                {isCorrect ? "Correct" : "Wrong"}
              </span>
              <span className="bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-xs font-medium px-2 py-0.5 rounded capitalize">
                {type.replace("_", " ")}
              </span>
              <span className={`text-sm font-bold px-3 py-0.5 rounded-full border ${scoreColor}`}>
                Score: {score}/100
              </span>
            </div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mt-2">
              {question}
            </h3>
          </div>
        </div>
      </div>

      <div className="ml-0 sm:ml-9 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-gray-50 dark:bg-gray-900/50 p-4 rounded-xl border border-gray-100 dark:border-gray-800">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1 block">Your answer</span>
            <p className="text-gray-900 dark:text-gray-100">{userAnswer || "-"}</p>
          </div>
          <div className="bg-blue-50/50 dark:bg-blue-900/10 p-4 rounded-xl border border-blue-100 dark:border-blue-900/30">
            <span className="text-xs font-semibold text-blue-600 uppercase tracking-wider mb-1 block">Reference answer</span>
            <p className="text-gray-900 dark:text-gray-100">{correctAnswer}</p>
          </div>
        </div>

        {aiFeedback ? (
          <div className={`p-4 rounded-xl border ${isCorrect
            ? "bg-emerald-50 dark:bg-emerald-900/10 border-emerald-100 dark:border-emerald-900/30"
            : "bg-amber-50 dark:bg-amber-900/10 border-amber-100 dark:border-amber-900/30"
            }`}>
            <div className="flex items-center gap-1.5 mb-1">
              <Sparkles className={`w-3.5 h-3.5 ${isCorrect ? "text-emerald-600" : "text-amber-600"}`} />
              <span className={`text-xs font-semibold uppercase tracking-wider ${isCorrect ? "text-emerald-600" : "text-amber-600"}`}>
                AI Analysis & Feedback
              </span>
            </div>
            <p className="text-gray-800 dark:text-gray-200 text-sm leading-relaxed">{aiFeedback}</p>
          </div>
        ) : explanation ? (
          <div className="bg-amber-50 dark:bg-amber-900/10 p-4 rounded-xl border border-amber-100 dark:border-amber-900/30">
            <span className="text-xs font-semibold text-amber-600 uppercase tracking-wider mb-1 block">Explanation</span>
            <p className="text-gray-800 dark:text-gray-200 text-sm leading-relaxed">{explanation}</p>
          </div>
        ) : null}
      </div>
    </div>
  )
}

function QuizResultCard({
  isCorrect,
  question,
  userAnswer,
  correctAnswer,
  explanation,
}: {
  isCorrect: boolean;
  question: string;
  userAnswer: string;
  correctAnswer: string;
  explanation: string;
}) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
      <div className="flex flex-col sm:flex-row justify-between sm:items-start gap-4 mb-4">
        <div className="flex items-start gap-3">
          <div className="mt-1">
            {isCorrect ? (
              <CheckCircle2 className="w-6 h-6 text-emerald-500" />
            ) : (
              <XCircle className="w-6 h-6 text-red-500" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className={`text-sm font-semibold px-2.5 py-0.5 rounded ${isCorrect
                ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300"
                : "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300"
                }`}>
                {isCorrect ? "Correct" : "Wrong"}
              </span>
              <span className="bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-xs font-medium px-2 py-0.5 rounded capitalize">
                Multiple Choice
              </span>
            </div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mt-2">
              {question}
            </h3>
          </div>
        </div>
      </div>

      <div className="ml-0 sm:ml-9 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-gray-50 dark:bg-gray-900/50 p-4 rounded-xl border border-gray-100 dark:border-gray-800">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1 block">Your answer</span>
            <p className="text-gray-900 dark:text-gray-100">{userAnswer || "-"}</p>
          </div>
          <div className="bg-blue-50/50 dark:bg-blue-900/10 p-4 rounded-xl border border-blue-100 dark:border-blue-900/30">
            <span className="text-xs font-semibold text-blue-600 uppercase tracking-wider mb-1 block">Correct answer</span>
            <p className="text-gray-900 dark:text-gray-100">{correctAnswer}</p>
          </div>
        </div>

        {explanation && (
          <div className="bg-amber-50 dark:bg-amber-900/10 p-4 rounded-xl border border-amber-100 dark:border-amber-900/30">
            <span className="text-xs font-semibold text-amber-600 uppercase tracking-wider mb-1 block">Explanation</span>
            <p className="text-gray-800 dark:text-gray-200 text-sm leading-relaxed">{explanation}</p>
          </div>
        )}
      </div>
    </div>
  )
}
