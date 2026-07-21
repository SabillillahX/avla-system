"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { assessmentApi } from "@/lib/api/assessment"
import { classesApi } from "@/lib/api/classes"
import { AssessmentQuestion } from "@/lib/types/assessment"
import { useAuth } from "@/lib/contexts/AuthContext"
import { Button } from "@/lib/components/ui/button"
import { Loader2, ArrowLeft, CheckCircle2, XCircle, CheckCircle } from "lucide-react"
import { Client } from "@modelcontextprotocol/sdk/client/index.js"
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js"

export default function AssessmentPage({ params, searchParams }: { params: { id: string, videoId: string }, searchParams: { batch_id?: string } }) {
  const router = useRouter()
  const { token, user } = useAuth()

  const [questions, setQuestions] = useState<AssessmentQuestion[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [enrolledBatchId, setEnrolledBatchId] = useState<string | null>(null)

  // State for tracking user answers per question
  const [userAnswers, setUserAnswers] = useState<Record<string, string>>({})
  const [isSubmittingAll, setIsSubmittingAll] = useState(false)
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    setIsClient(true)
    const fetchQuestions = async () => {
      try {
        const courseRes = await classesApi.get(params.id, searchParams.batch_id)
        const batchId = (courseRes as any).data?.enrolled_batch_id || searchParams.batch_id || null
        setEnrolledBatchId(batchId)

        const response = await assessmentApi.getQuestions(params.videoId, batchId || params.id)
        setQuestions(response.data)
      } catch (err: any) {
        setError(err.message || "Failed to load assessment questions")
      } finally {
        setIsLoading(false)
      }
    }

    if (token) {
      fetchQuestions()
    }
  }, [params.videoId, params.id, token])

  const handleOptionChange = (questionId: string, answer: string) => {
    setUserAnswers((prev) => ({ ...prev, [questionId]: answer }))
  }

  const isAllAnswered = questions.length > 0 && Object.keys(userAnswers).length === questions.length

  const handleSubmitAll = async () => {
    if (!isAllAnswered) return
    setIsSubmittingAll(true)

    try {
      let mcpClient: Client | null = null;
      try {
        const mcpUrl = process.env.NEXT_PUBLIC_MCP_SERVER_URL
        const transport = new SSEClientTransport(new URL(`${mcpUrl}/sse`))
        mcpClient = new Client({ name: "frontend", version: "1.0.0" }, { capabilities: {} })
        await mcpClient.connect(transport)
      } catch (err) {
        console.error("Failed to connect to MCP", err)
      }

      const submitPromises = questions.map(async (question) => {
        if (question.has_answered) return null

        const answer = userAnswers[question.uuid]
        if (!answer) return null

        const response = await assessmentApi.submitAnswer({
          question_id: question.uuid,
          batch_id: enrolledBatchId || searchParams.batch_id || params.id,
          user_answer: answer,
        })

        if (mcpClient && (question.type === "short_answer" || question.type === "essay")) {
          try {
            const result = await mcpClient.callTool({
              name: "evaluateStudentAnswer",
              arguments: {
                questionId: question.uuid,
                question: question.question,
                studentAnswer: answer,
                referenceAnswer: question.correct_answer || null
              }
            })

            const content = result?.content as any[];
            if (content && Array.isArray(content) && content.length > 0 && content[0].type === 'text') {
              const parsed = JSON.parse(content[0].text as string);
              if (parsed.score !== null && parsed.score !== undefined) {
                await assessmentApi.updateScore(question.uuid, {
                  batch_id: enrolledBatchId,
                  ai_score_suggestion: parsed.score,
                  ai_feedback_suggestion: parsed.feedback
                });
              }
            }
          } catch (aiErr) {
            console.error("AI evaluation failed:", aiErr)
          }
        }

        return { questionId: question.uuid, response }
      })

      await Promise.all(submitPromises)      // Mark visually
      const updatedQuestions = questions.map(q => ({
        ...q,
        has_answered: true
      }))
      setQuestions(updatedQuestions)

      setShowSuccessModal(true)
    } catch (err: any) {
      console.error("Failed to submit answers:", err)
      // Could show a toast here
    } finally {
      setIsSubmittingAll(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3 text-gray-400">
        <Loader2 className="w-8 h-8 animate-spin" />
        <span>Loading assessment questions...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3 text-red-500">
        <p className="text-lg font-semibold">{error}</p>
        <Button variant="outline" onClick={() => router.back()}>
          Kembali
        </Button>
      </div>
    )
  }

  // Check if all questions are completed
  const isEverythingCompleted = questions.every(q => q.has_answered)

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-5xl mx-auto min-h-screen">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 sm:mb-8">
        <Button
          variant="ghost"
          onClick={() => router.back()}
          className="hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full px-4 self-start"
        >
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to Video
        </Button>
        <h1 className="text-xl sm:text-2xl font-semibold text-gray-900 dark:text-white">Assessment</h1>
      </div>

      {questions.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 text-center border">
          <p className="text-gray-500">There are no questions yet.</p>
        </div>
      ) : (
        <div
          className="space-y-6"
          onCopy={(e) => {
            e.preventDefault()
            return false
          }}
        >
          <div className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 mb-2 px-2">
            <span className="text-red-500 font-bold text-base mt-1">*</span>
            <span>Must be answered</span>
          </div>

          {questions.map((question, index) => {
            const isAnswered = question.has_answered

            return (
              <div
                key={question.uuid}
                className="bg-white dark:bg-gray-800 rounded-2xl p-4 sm:p-6 shadow-sm hover:shadow-md transition-shadow border border-gray-100 dark:border-gray-700 select-none"
              >
                <div className="mb-4">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="bg-blue-50 text-blue-700 border border-blue-100 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800 text-xs font-semibold px-2.5 py-0.5 rounded-full capitalize">
                      {question.type.replace("_", " ")}
                    </span>
                    {isAnswered && (
                      <span className="bg-gray-50 text-gray-600 border border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700 text-xs font-semibold px-2.5 py-0.5 rounded-full">
                        Selesai
                      </span>
                    )}
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 pointer-events-none">
                    {index + 1}. {question.question}
                    <span className="text-red-500 ml-1.5" title="Must be answered">*</span>
                  </h3>
                </div>

                <div className="my-4">
                  {question.type === "multiple_choice" && question.options && (
                    <div className="space-y-2">
                      {question.options.map((option, i) => (
                        <div key={i} className="flex items-center gap-3">
                          <input
                            type="radio"
                            id={`q-${question.uuid}-opt-${i}`}
                            name={`q-${question.uuid}`}
                            value={option}
                            checked={userAnswers[question.uuid] === option}
                            onChange={(e) => handleOptionChange(question.uuid, e.target.value)}
                            disabled={isAnswered || isSubmittingAll}
                            className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500 disabled:opacity-50"
                          />
                          <label
                            htmlFor={`q-${question.uuid}-opt-${i}`}
                            className={`text-sm select-none ${isAnswered ? "text-gray-500 cursor-not-allowed pointer-events-none" : "text-gray-700 dark:text-gray-300 cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                              }`}
                          >
                            {option}
                          </label>
                        </div>
                      ))}
                    </div>
                  )}

                  {(question.type === "short_answer" || question.type === "essay") && (
                    <textarea
                      value={userAnswers[question.uuid] || ""}
                      onChange={(e) => handleOptionChange(question.uuid, e.target.value)}
                      disabled={isAnswered || isSubmittingAll}
                      className="w-full p-4 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all resize-none shadow-sm disabled:opacity-60 disabled:cursor-not-allowed select-text"
                      rows={question.type === "essay" ? 4 : 2}
                      placeholder="Ketik jawaban Anda di sini..."
                      onCopy={(e) => e.stopPropagation()}
                    />
                  )}
                </div>
              </div>
            )
          })}

          <div className="pt-6 pb-12 flex flex-col sm:flex-row sm:justify-end">
            <Button
              onClick={handleSubmitAll}
              disabled={!isAllAnswered || isSubmittingAll || isEverythingCompleted}
              size="lg"
              className={`font-medium px-6 sm:px-8 py-5 sm:py-6 rounded-xl transition-all flex items-center justify-center gap-2 w-full sm:w-auto ${isEverythingCompleted
                ? "bg-gray-100 text-gray-500 border border-gray-200 cursor-not-allowed dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700 shadow-none hover:bg-gray-100 dark:hover:bg-gray-800"
                : "bg-blue-600 hover:bg-blue-700 text-white shadow-md hover:shadow-lg"
                }`}
            >
              {isSubmittingAll && <Loader2 className="w-5 h-5 mr-2 animate-spin" />}
              {isEverythingCompleted
                ? "Already Submitted"
                : isAllAnswered
                  ? "Submit Answer"
                  : "Fill all the question to submit"}
            </Button>
          </div>
        </div>
      )}

      {showSuccessModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 max-w-sm w-full shadow-xl flex flex-col items-center text-center animate-in fade-in zoom-in duration-200">
            <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 text-green-600 rounded-full flex items-center justify-center mb-6">
              <CheckCircle className="w-12 h-12" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Answer Submitted</h2>
            <p className="text-gray-500 dark:text-gray-400 mb-8">
              Semua jawaban Anda telah berhasil disimpan.
            </p>
            <Button
              onClick={() => {
                setShowSuccessModal(false)
                router.push(`/my-course/${params.id}/video/${params.videoId}/results${enrolledBatchId ? `?batch_id=${enrolledBatchId}` : ''}`)
              }}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-6 text-lg rounded-xl"
            >
              Lihat Hasil
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
