"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { ArrowLeft, CheckCircle2, XCircle, Loader2, Sparkles, AlertCircle, FileCheck, Users, ChevronRight, User, Clock } from "lucide-react"
import { ProtectedRoute } from "@/components/auth/ProtectedRoute"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import api from "@/lib/api/axios"
import { toast } from "sonner"

interface StudentAnswer {
  id: string;
  user_answer: string;
  is_correct: boolean | null;
  score: number | null;
  feedback: string | null;
  created_at: string;
  question: {
    uuid: string;
    question: string;
    correct_answer: string | null;
    type: string;
  };
}

interface EnrolledStudent {
  user: {
    id: string;
    name: string;
    email: string;
  };
  total_questions: number;
  answered_count: number;
  graded_count: number;
  is_finished: boolean;
  answers: StudentAnswer[];
}

export default function AssessmentGradingPage() {
  const { id: classId } = useParams()
  const router = useRouter()

  const [students, setStudents] = useState<EnrolledStudent[]>([])
  const [totalQuestions, setTotalQuestions] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")

  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null)

  const [gradingState, setGradingState] = useState<Record<string, {
    score: number | null;
    feedback: string;
    is_correct: boolean | null;
  }>>({})
  const [isSubmitting, setIsSubmitting] = useState<string | null>(null)

  useEffect(() => {
    fetchData()
  }, [classId])

  const fetchData = async () => {
    try {
      setIsLoading(true)
      setError("")
      const res = await api.get(`/courses/${classId}/student-answers`)
      const responseData = res.data
      setTotalQuestions(responseData.total_questions || 0)

      // Initialize grading state for all answers
      const initialGradingState: Record<string, any> = {}
      const allStudents: EnrolledStudent[] = (responseData.data || []).map((s: any) => ({
        ...s,
        answers: Array.isArray(s.answers) ? s.answers : (s.answers?.data ?? []),
      }))
      setStudents(allStudents)
      allStudents.forEach((student: EnrolledStudent) => {
        (student.answers || []).forEach((ans: StudentAnswer) => {
          initialGradingState[ans.id] = {
            score: ans.score,
            feedback: ans.feedback || "",
            is_correct: ans.is_correct
          }
        })
      })
      setGradingState(initialGradingState)
    } catch (err: any) {
      console.error("Fetch student answers error:", err?.response?.status, err?.response?.data, err)
      const status = err?.response?.status
      const detail = err?.response?.data?.message || err?.message || "Unknown error"
      setError(`Failed to fetch student assessments. (HTTP ${status}: ${detail})`)
    } finally {
      setIsLoading(false)
    }
  }

  const handleGrade = async (answerId: string) => {
    const state = gradingState[answerId]
    if (state.is_correct === null) {
      toast.error("Please mark the answer as correct or wrong.")
      return
    }

    try {
      setIsSubmitting(answerId)
      await api.put(`/question-answers/${answerId}/grade`, {
        score: state.score,
        feedback: state.feedback || null,
        is_correct: state.is_correct
      })
      toast.success("Grade submitted successfully")
      await fetchData()
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to submit grade")
    } finally {
      setIsSubmitting(null)
    }
  }

  const updateState = (answerId: string, field: string, value: any) => {
    setGradingState(prev => ({
      ...prev,
      [answerId]: { ...prev[answerId], [field]: value }
    }))
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3 text-gray-400">
        <Loader2 className="w-8 h-8 animate-spin" />
        <span>Loading assessments...</span>
      </div>
    )
  }

  // ── DETAIL VIEW: Grading a specific student ──
  if (selectedStudentId) {
    const studentData = students.find(s => s.user.id === selectedStudentId)
    if (!studentData) {
      setSelectedStudentId(null)
      return null
    }

    return (
      <ProtectedRoute requireRole={["admin", "teacher"]}>
        <div className="max-w-5xl mx-auto p-4 sm:p-6 lg:p-8 min-h-screen">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setSelectedStudentId(null)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <User className="w-6 h-6 text-indigo-500" /> {studentData.user.name}
                </h1>
                <p className="text-gray-500 dark:text-gray-400 text-sm">{studentData.user.email}</p>
              </div>
            </div>
            <div className="bg-indigo-50 dark:bg-indigo-900/20 px-4 py-2 rounded-lg border border-indigo-100 dark:border-indigo-900/40">
              <p className="text-sm text-indigo-700 dark:text-indigo-300 font-medium">
                {studentData.answered_count} / {studentData.total_questions} answered
                {" · "}
                {studentData.graded_count} graded
              </p>
            </div>
          </div>

          {!studentData.is_finished && (
            <div className="mb-6 p-4 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 rounded-xl flex items-center gap-3 border border-amber-200 dark:border-amber-800">
              <Clock className="w-5 h-5 shrink-0" />
              <p className="text-sm font-medium">
                This student has not finished the assessment yet ({studentData.answered_count}/{studentData.total_questions} questions answered).
              </p>
            </div>
          )}

          {(studentData.answers || []).length === 0 ? (
            <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700">
              <FileCheck className="w-12 h-12 mx-auto text-gray-300 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">No answers yet</h3>
              <p className="text-gray-500">This student hasn't submitted any answers.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {(studentData.answers || []).map(ans => {
                const state = gradingState[ans.id] || { score: null, feedback: "", is_correct: null }
                return (
                  <div key={ans.id} className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
                    <div className="flex justify-between items-start mb-6 pb-4 border-b border-gray-100 dark:border-gray-700">
                      <div>
                        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1 block">Question</span>
                        <p className="text-lg font-medium text-gray-900 dark:text-white">{ans.question.question}</p>
                      </div>
                      <div className="text-sm text-gray-400 shrink-0 ml-4">
                        {new Date(ans.created_at).toLocaleString()}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                      <div className="bg-gray-50 dark:bg-gray-900/50 p-4 rounded-xl border border-gray-200 dark:border-gray-700">
                        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1 block">Student&apos;s Answer</span>
                        <p className="text-gray-900 dark:text-gray-100 whitespace-pre-line">{ans.user_answer || "-"}</p>
                      </div>

                      <div className="bg-emerald-50 dark:bg-emerald-900/10 p-4 rounded-xl border border-emerald-100 dark:border-emerald-900/30">
                        <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider mb-1 block">Reference / Correct Answer</span>
                        <p className="text-emerald-900 dark:text-emerald-300 whitespace-pre-line">
                          {ans.question.correct_answer || "No reference provided"}
                        </p>
                      </div>
                    </div>

                    {/* Grading Controls */}
                    <div className="bg-blue-50/50 dark:bg-blue-900/10 p-5 rounded-xl border border-blue-100 dark:border-blue-900/30 space-y-4">
                      <div className="flex flex-col sm:flex-row gap-6">
                        <div className="flex-1 space-y-2">
                          <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Evaluation</label>
                          <div className="flex gap-2">
                            <Button
                              variant={state.is_correct === true ? "default" : "outline"}
                              className={state.is_correct === true ? "bg-emerald-600 hover:bg-emerald-700 text-white" : ""}
                              onClick={() => updateState(ans.id, 'is_correct', true)}
                            >
                              <CheckCircle2 className="w-4 h-4 mr-2" /> Correct
                            </Button>
                            <Button
                              variant={state.is_correct === false ? "default" : "outline"}
                              className={state.is_correct === false ? "bg-red-600 hover:bg-red-700 text-white" : ""}
                              onClick={() => updateState(ans.id, 'is_correct', false)}
                            >
                              <XCircle className="w-4 h-4 mr-2" /> Wrong
                            </Button>
                          </div>
                        </div>

                        <div className="w-full sm:w-32 space-y-2">
                          <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Score (0-100)</label>
                          <Input
                            type="number"
                            min={0}
                            max={100}
                            step={1}
                            placeholder="0"
                            value={state.score !== null ? state.score : ""}
                            onChange={(e) => {
                              const raw = e.target.value
                              if (raw === "") {
                                updateState(ans.id, 'score', null)
                              } else {
                                const num = parseInt(raw, 10)
                                if (!isNaN(num) && num >= 0 && num <= 100) {
                                  updateState(ans.id, 'score', num)
                                }
                              }
                            }}
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                          <Sparkles className="w-4 h-4 text-amber-500" /> Feedback (Optional)
                        </label>
                        <Textarea
                          placeholder="Provide constructive feedback on what the student did well or needs to improve..."
                          rows={3}
                          value={state.feedback}
                          onChange={(e) => updateState(ans.id, 'feedback', e.target.value)}
                          className="bg-white dark:bg-gray-900"
                        />
                      </div>

                      <div className="pt-2 flex justify-end">
                        <Button
                          onClick={() => handleGrade(ans.id)}
                          disabled={isSubmitting === ans.id || state.is_correct === null}
                          className="bg-indigo-600 hover:bg-indigo-700 text-white min-w-[120px]"
                        >
                          {isSubmitting === ans.id ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : "Save Grade"}
                        </Button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </ProtectedRoute>
    )
  }

  // ── LIST VIEW: Show all enrolled students ──
  return (
    <ProtectedRoute requireRole={["admin", "teacher"]}>
      <div className="max-w-5xl mx-auto p-4 sm:p-6 lg:p-8 min-h-screen">
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={() => router.back()}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              Students Assessments
            </h1>
            <p className="text-gray-500 dark:text-gray-400 text-sm">
              {totalQuestions} assessment questions · Select a student to grade their answers.
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 text-red-600 rounded-lg flex items-center gap-3">
            <AlertCircle className="w-5 h-5" />
            <p>{error}</p>
          </div>
        )}

        <div className="space-y-4">
          {students.length === 0 ? (
            <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">No students enrolled</h3>
              <p className="text-gray-500">No students are enrolled in this course yet.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {students.map(student => (
                <Card
                  key={student.user.id}
                  className="cursor-pointer hover:border-indigo-300 dark:hover:border-indigo-700 transition-all hover:shadow-md group"
                  onClick={() => setSelectedStudentId(student.user.id)}
                >
                  <CardContent className="p-6 flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                        {student.user.name}
                      </h3>
                      <p className="text-sm text-gray-500 mb-3">{student.user.email}</p>
                      <div className="flex flex-wrap gap-2">
                        <Badge variant="secondary" className="bg-gray-100 dark:bg-gray-800">
                          {student.answered_count}/{student.total_questions} Answered
                        </Badge>

                        {!student.is_finished ? (
                          <Badge variant="secondary" className="bg-amber-100 text-amber-700 hover:bg-amber-100 dark:bg-amber-900/30 dark:text-amber-400">
                            Not Finished Yet
                          </Badge>
                        ) : student.graded_count < student.answered_count ? (
                          <Badge variant="secondary" className="bg-blue-100 text-blue-700 hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400">
                            {student.answered_count - student.graded_count} Pending Review
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-400">
                            All Graded
                          </Badge>
                        )}
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-indigo-500 transition-colors" />
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </ProtectedRoute>
  )
}
