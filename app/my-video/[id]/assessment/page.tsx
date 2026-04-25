"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { assessmentApi } from "@/lib/api/assessment"
import { AssessmentQuestion } from "@/lib/types/assessment"
import { useAuth } from "@/contexts/AuthContext"
import { Button } from "@/components/ui/button"
import { Loader2, ArrowLeft, CheckCircle2, XCircle } from "lucide-react"

export default function AssessmentPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const { token } = useAuth()
  
  const [questions, setQuestions] = useState<AssessmentQuestion[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // State for tracking user answers per question
  const [userAnswers, setUserAnswers] = useState<Record<string, string>>({})
  const [submittingIds, setSubmittingIds] = useState<Set<string>>(new Set())
  const [results, setResults] = useState<Record<string, { isCorrect: boolean, feedback: string }>>({})

  useEffect(() => {
    const fetchQuestions = async () => {
      try {
        const response = await assessmentApi.getQuestions(params.id)
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
  }, [params.id, token])

  const handleOptionChange = (questionId: string, answer: string) => {
    setUserAnswers((prev) => ({ ...prev, [questionId]: answer }))
  }

  const isAllAnswered = questions.length > 0 && Object.keys(userAnswers).length === questions.length
  const [isSubmittingAll, setIsSubmittingAll] = useState(false)

  const handleSubmitAll = async () => {
    if (!isAllAnswered) return
    setIsSubmittingAll(true)

    try {
      // Create an array of submit promises
      const submitPromises = questions.map(async (question) => {
        // Skip if already answered previously
        if (question.has_answered) return null
        
        const answer = userAnswers[question.uuid]
        if (!answer) return null

        const response = await assessmentApi.submitAnswer({
          question_id: question.uuid,
          user_answer: answer,
        })
        return { questionId: question.uuid, response }
      })

      const resultsArray = await Promise.all(submitPromises)

      // Process results
      const newResults = { ...results }
      const newQuestions = [...questions]

      resultsArray.forEach((item) => {
        if (!item) return
        
        newResults[item.questionId] = {
           isCorrect: item.response.data.is_correct,
           feedback: item.response.message
        }

        const qIndex = newQuestions.findIndex(q => q.uuid === item.questionId)
        if (qIndex !== -1) {
          newQuestions[qIndex] = {
            ...newQuestions[qIndex],
            has_answered: true,
            accepted_answers: item.response.data.question.accepted_answers
          }
        }
      })

      setResults(newResults)
      setQuestions(newQuestions)
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
        <span>Memuat soal penilaian...</span>
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

  // Check if all questions are completed or have feedback shown
  const isEverythingCompleted = questions.every(q => q.has_answered)

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-[1000px] mx-auto min-h-screen">
      <div className="flex items-center justify-between mb-8">
        <Button 
          variant="ghost" 
          onClick={() => router.back()} 
          className="hover:bg-gray-100 dark:hover:bg-gray-800"
        >
          <ArrowLeft className="w-4 h-4 mr-2" /> Kembali ke Video
        </Button>
        <h1 className="text-2xl font-bold">Penilaian Keseluruhan</h1>
      </div>

      {questions.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 text-center border">
          <p className="text-gray-500">Belum ada soal untuk video ini.</p>
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
            <span>Wajib diisi</span>
          </div>

          {questions.map((question, index) => {
            const result = results[question.uuid]
            const isAnswered = question.has_answered

            return (
              <div 
                key={question.uuid} 
                className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700 select-none"
              >
                <div className="mb-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="bg-blue-100 text-blue-800 text-xs font-semibold px-2.5 py-0.5 rounded capitalize">
                      {question.type.replace("_", " ")}
                    </span>
                    {isAnswered && (
                      <span className="bg-gray-100 text-gray-800 text-xs font-semibold px-2.5 py-0.5 rounded">
                        Selesai
                      </span>
                    )}
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 pointer-events-none">
                    {index + 1}. {question.question}
                    <span className="text-red-500 ml-1.5" title="Wajib diisi">*</span>
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
                            className={`text-sm ${
                              isAnswered ? "text-gray-500 cursor-not-allowed pointer-events-none" : "text-gray-700 dark:text-gray-300 cursor-pointer"
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
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 bg-gray-50 dark:bg-gray-900 dark:border-gray-700 disabled:opacity-50 select-text"
                      rows={question.type === "essay" ? 4 : 2}
                      placeholder="Ketik jawaban Anda di sini..."
                      onCopy={(e) => e.stopPropagation()}
                    />
                  )}
                </div>

                <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700 flex flex-col gap-4">
                  {(result || isAnswered) && (
                    <div className={`p-4 rounded-lg flex items-start gap-3 select-text ${
                      result?.isCorrect 
                        ? "bg-green-50 text-green-800 border border-green-200" 
                        : result && !result.isCorrect 
                          ? "bg-red-50 text-red-800 border border-red-200"
                          : "bg-blue-50 text-blue-800 border border-blue-200"
                    }`}>
                      {result?.isCorrect ? (
                        <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" />
                      ) : result && !result.isCorrect ? (
                        <XCircle className="w-5 h-5 shrink-0 mt-0.5" />
                      ) : null}
                      <div>
                        {result && (
                          <p className="font-semibold mb-1">
                            {result.isCorrect ? "Jawaban Benar" : "Jawaban Kurang Tepat"}
                          </p>
                        )}
                        <p className="text-sm">
                          <strong>Penjelasan:</strong> {question.explanation}
                        </p>
                        {question.accepted_answers && question.accepted_answers.length > 0 && (
                          <div className="mt-2 text-sm opacity-90">
                            <strong>Jawaban yang diterima:</strong>
                            <ul className="list-disc list-inside ml-2 mt-1">
                              {question.accepted_answers.map((ans, i) => (
                                <li key={i}>{ans}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )
          })}

          {!isEverythingCompleted && (
            <div className="pt-6 pb-12 flex justify-end">
              <Button 
                onClick={handleSubmitAll}
                disabled={!isAllAnswered || isSubmittingAll}
                size="lg"
                className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-8 py-6 rounded-xl shadow-md transition-all flex items-center gap-2"
              >
                {isSubmittingAll && <Loader2 className="w-5 h-5 mr-2 animate-spin" />}
                {isAllAnswered ? "Submit Semua Jawaban" : "Jawab Semua Soal Untuk Submit"}
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

