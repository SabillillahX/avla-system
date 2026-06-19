"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { ProtectedRoute } from "@/components/auth/ProtectedRoute"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import {
  ArrowLeft, Loader2, Plus, HelpCircle, FileText, Pencil, Trash2,
  Save, X, CheckCircle2, Clock,
} from "lucide-react"
import { toast } from "sonner"
import { videosApi, UpdateAssessmentPayload, CreateAssessmentPayload } from "@/lib/api/handle-videos"
import { Quiz, AssessmentQuestion } from "@/lib/types/handle-videos"
import { cn } from "@/lib/utils"

// ─── Quiz Edit Modal ─────────────────────────────────────────────────────────

interface QuizEditState {
  trigger_time: number
  question: string
  options: string[]
  correct_answer: string
  explanation: string
}

function QuizEditModal({
  quiz,
  onClose,
  onSave,
}: {
  quiz: Quiz
  onClose: () => void
  onSave: (updated: QuizEditState) => void
}) {
  const [form, setForm] = useState<QuizEditState>({
    trigger_time: quiz.trigger_time,
    question: quiz.question,
    options: [...quiz.options],
    correct_answer: quiz.correct_answer,
    explanation: quiz.explanation || "",
  })

  const updateOption = (index: number, value: string) => {
    const next = [...form.options]
    if (form.correct_answer === next[index]) {
      setForm((prev) => ({ ...prev, options: next.map((o, i) => (i === index ? value : o)), correct_answer: value }))
    } else {
      next[index] = value
      setForm((prev) => ({ ...prev, options: next }))
    }
  }

  const addOption = () => setForm((prev) => ({ ...prev, options: [...prev.options, ""] }))

  const removeOption = (index: number) => {
    const next = form.options.filter((_, i) => i !== index)
    setForm((prev) => ({
      ...prev,
      options: next,
      correct_answer: prev.correct_answer === prev.options[index] ? "" : prev.correct_answer,
    }))
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[620px] max-h-[90vh] overflow-hidden flex flex-col p-0 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-xl bg-white dark:bg-gray-900">
        <DialogHeader className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50 shrink-0">
          <DialogTitle className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <HelpCircle className="w-5 h-5 text-blue-500" /> Edit Quiz Question
          </DialogTitle>
        </DialogHeader>

        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-5">
          <div className="space-y-1.5">
            <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">Question <span className="text-red-500">*</span></Label>
            <textarea
              value={form.question}
              onChange={(e) => setForm((prev) => ({ ...prev, question: e.target.value }))}
              rows={3}
              className="w-full rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all resize-none"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">Trigger Time (seconds)</Label>
            <Input
              type="number"
              min={0}
              value={form.trigger_time}
              onChange={(e) => setForm((prev) => ({ ...prev, trigger_time: Number(e.target.value) }))}
              className="bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700 rounded-xl"
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">Answer Options <span className="text-red-500">*</span></Label>
              <Button type="button" variant="outline" size="sm" onClick={addOption} className="h-7 text-xs gap-1">
                <Plus className="w-3 h-3" /> Add Option
              </Button>
            </div>
            <p className="text-xs text-gray-400 dark:text-gray-500">Click an option to mark it as the correct answer.</p>
            <div className="space-y-2">
              {form.options.map((opt, i) => (
                <div key={i} className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setForm((prev) => ({ ...prev, correct_answer: opt }))}
                    className={cn(
                      "shrink-0 w-5 h-5 rounded-full border-2 transition-colors",
                      form.correct_answer === opt
                        ? "border-emerald-500 bg-emerald-500"
                        : "border-gray-300 dark:border-gray-600 hover:border-emerald-400"
                    )}
                  />
                  <Input
                    value={opt}
                    onChange={(e) => updateOption(i, e.target.value)}
                    placeholder={`Option ${i + 1}`}
                    className={cn(
                      "flex-1 rounded-xl text-sm transition-colors",
                      form.correct_answer === opt
                        ? "border-emerald-300 bg-emerald-50 dark:bg-emerald-900/20 dark:border-emerald-700"
                        : "bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700"
                    )}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="shrink-0 h-8 w-8 text-gray-400 hover:text-red-500"
                    onClick={() => removeOption(i)}
                    disabled={form.options.length <= 2}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">Explanation / Feedback</Label>
            <textarea
              value={form.explanation}
              onChange={(e) => setForm((prev) => ({ ...prev, explanation: e.target.value }))}
              rows={3}
              placeholder="Explain why the correct answer is right..."
              className="w-full rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all resize-none"
            />
          </div>
        </div>

        <div className="shrink-0 px-6 py-4 border-t border-gray-100 dark:border-gray-800 flex justify-end gap-2">
          <Button variant="outline" onClick={onClose} className="rounded-xl">Cancel</Button>
          <Button
            onClick={() => onSave(form)}
            disabled={!form.question.trim() || form.options.length < 2 || !form.correct_answer}
            className="rounded-xl bg-blue-600 hover:bg-blue-700 gap-2"
          >
            <Save className="w-4 h-4" /> Save Changes
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ─── Assessment Edit Modal ────────────────────────────────────────────────────

interface AssessmentEditState {
  question: string
  explanation: string
}

function AssessmentEditModal({
  assessment,
  videoId,
  isNew,
  onClose,
  onSaved,
}: {
  assessment: AssessmentQuestion | null
  videoId: string
  isNew: boolean
  onClose: () => void
  onSaved: (result: AssessmentQuestion) => void
}) {
  const [form, setForm] = useState<AssessmentEditState>({
    question: assessment?.question || "",
    explanation: assessment?.explanation || "",
  })
  const [isSaving, setIsSaving] = useState(false)

  const handleSave = async () => {
    if (!form.question.trim()) return

    setIsSaving(true)
    try {
      const payload: UpdateAssessmentPayload | CreateAssessmentPayload = {
        video_id: videoId,
        type: assessment?.type || "essay",
        question: form.question.trim(),
        explanation: form.explanation.trim() || null,
        bloom_level: assessment?.bloom_level ?? null,
        options: assessment?.options ?? null,
      }

      const result = isNew
        ? await videosApi.createAssessment(payload as CreateAssessmentPayload)
        : await videosApi.updateAssessment(assessment!.uuid, payload)

      toast.success(isNew ? "Question added" : "Question updated")
      onSaved(result)
    } catch {
      toast.error("Failed to save question")
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[620px] max-h-[90vh] overflow-hidden flex flex-col p-0 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-xl bg-white dark:bg-gray-900">
        <DialogHeader className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 bg-blue-50/50 dark:bg-blue-900/10 shrink-0">
          <DialogTitle className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-500" />
            {isNew ? "Add New Assessment Question" : "Edit Assessment Question"}
          </DialogTitle>
        </DialogHeader>

        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-5">
          <div className="space-y-1.5">
            <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">Question <span className="text-red-500">*</span></Label>
            <textarea
              value={form.question}
              onChange={(e) => setForm((prev) => ({ ...prev, question: e.target.value }))}
              rows={3}
              placeholder="Enter the assessment question..."
              className="w-full rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all resize-none"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">Explanation</Label>
            <textarea
              value={form.explanation}
              onChange={(e) => setForm((prev) => ({ ...prev, explanation: e.target.value }))}
              rows={3}
              placeholder="Explain the reasoning behind the correct answer..."
              className="w-full rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all resize-none"
            />
          </div>

        </div>

        <div className="shrink-0 px-6 py-4 border-t border-gray-100 dark:border-gray-800 flex justify-end gap-2">
          <Button variant="outline" onClick={onClose} disabled={isSaving} className="rounded-xl">Cancel</Button>
          <Button
            onClick={handleSave}
            disabled={isSaving || !form.question.trim()}
            className="rounded-xl bg-blue-600 hover:bg-blue-700 gap-2"
          >
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {isNew ? "Add Question" : "Save Changes"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ManageQuestionsPage({ params }: { params: { videoId: string } }) {
  const router = useRouter()
  const { videoId } = params

  const [isLoading, setIsLoading] = useState(true)
  const [quizzes, setQuizzes] = useState<Quiz[]>([])
  const [assessments, setAssessments] = useState<AssessmentQuestion[]>([])

  // Quiz edit state
  const [editingQuiz, setEditingQuiz] = useState<Quiz | null>(null)
  const [isSavingQuizzes, setIsSavingQuizzes] = useState(false)

  // Assessment edit state
  const [editingAssessment, setEditingAssessment] = useState<AssessmentQuestion | null>(null)
  const [isAddingAssessment, setIsAddingAssessment] = useState(false)
  const [deletingAssessmentId, setDeletingAssessmentId] = useState<string | null>(null)

  useEffect(() => {
    const fetchQuestions = async () => {
      try {
        const [quizzesData, assessmentsData] = await Promise.all([
          videosApi.getVideoQuizzes(videoId),
          videosApi.getVideoAssessments(videoId),
        ])
        setQuizzes(quizzesData)
        setAssessments(assessmentsData)
      } catch {
        toast.error("Failed to load questions")
      } finally {
        setIsLoading(false)
      }
    }
    fetchQuestions()
  }, [videoId])

  const handleSaveQuiz = async (updated: QuizEditState) => {
    if (!editingQuiz) return
    const updatedQuizzes = quizzes.map((q) =>
      q.id === editingQuiz.id ? { ...q, ...updated } : q
    )
    setIsSavingQuizzes(true)
    try {
      await videosApi.updateQuizzes(videoId, {
        quizzes: updatedQuizzes.map((q) => ({
          trigger_time: q.trigger_time,
          question: q.question,
          options: q.options,
          correct_answer: q.correct_answer,
          explanation: q.explanation || null,
        })),
      })
      setQuizzes(updatedQuizzes)
      setEditingQuiz(null)
      toast.success("Quiz updated")
    } catch {
      toast.error("Failed to save quiz")
    } finally {
      setIsSavingQuizzes(false)
    }
  }

  const handleAssessmentSaved = (result: AssessmentQuestion) => {
    if (isAddingAssessment) {
      setAssessments((prev) => [...prev, result])
      setIsAddingAssessment(false)
    } else {
      setAssessments((prev) => prev.map((a) => (a.uuid === result.uuid ? result : a)))
      setEditingAssessment(null)
    }
  }

  const handleDeleteAssessment = async (uuid: string) => {
    setDeletingAssessmentId(uuid)
    try {
      await videosApi.deleteAssessment(uuid)
      setAssessments((prev) => prev.filter((a) => a.uuid !== uuid))
      toast.success("Question deleted")
    } catch {
      toast.error("Failed to delete question")
    } finally {
      setDeletingAssessmentId(null)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    )
  }

  return (
    <ProtectedRoute requireRole={["admin", "teacher"]}>
      <div className="max-w-5xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4 border-b border-gray-200 dark:border-gray-800 pb-6">
          <Button variant="outline" size="icon" onClick={() => router.back()} className="rounded-full shadow-sm shrink-0">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
              AI Results & Assessments
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              Review and edit AI generated quizzes and assessment questions.
            </p>
          </div>
        </div>

        <Tabs defaultValue="assessments" className="w-full">
          <TabsList className="w-full sm:w-auto grid grid-cols-2 bg-gray-100/50 dark:bg-gray-800/50 p-1 rounded-xl">
            <TabsTrigger value="quizzes" className="rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-gray-700 data-[state=active]:shadow-sm gap-2">
              <HelpCircle className="w-4 h-4" /> Video Quizzes ({quizzes.length})
            </TabsTrigger>
            <TabsTrigger value="assessments" className="rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-gray-700 data-[state=active]:shadow-sm gap-2">
              <FileText className="w-4 h-4" /> Assessments ({assessments.length})
            </TabsTrigger>
          </TabsList>

          {/* ── Quizzes Tab ── */}
          <TabsContent value="quizzes" className="mt-6 space-y-4">
            {quizzes.length === 0 ? (
              <div className="text-center py-16 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-dashed border-gray-300 dark:border-gray-700">
                <HelpCircle className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                <p className="text-gray-500 dark:text-gray-400 font-medium">No quizzes generated yet.</p>
              </div>
            ) : (
              quizzes.map((quiz, index) => (
                <Card key={quiz.id || index} className="shadow-sm border-gray-100 dark:border-gray-800 hover:shadow-md transition-shadow">
                  <CardHeader className="py-4 pb-3">
                    <div className="flex items-start justify-between gap-3">
                      <CardTitle className="text-base font-medium flex items-start gap-3 flex-1">
                        <span className="flex items-center justify-center bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300 w-6 h-6 rounded-full text-xs shrink-0 mt-0.5 font-semibold">
                          {index + 1}
                        </span>
                        <span className="text-gray-900 dark:text-white leading-snug">{quiz.question}</span>
                      </CardTitle>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="shrink-0 h-8 w-8 text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg"
                        onClick={() => setEditingQuiz(quiz)}
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0 pb-4 space-y-3 pl-9">
                    <ul className="space-y-1.5">
                      {quiz.options.map((opt, i) => {
                        const isCorrect = opt === quiz.correct_answer
                        return (
                          <li
                            key={i}
                            className={cn(
                              "text-sm p-2.5 rounded-lg border flex items-center gap-2.5",
                              isCorrect
                                ? "bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-900/20 dark:border-emerald-800 dark:text-emerald-300"
                                : "bg-gray-50 border-gray-100 text-gray-700 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-300"
                            )}
                          >
                            {isCorrect ? (
                              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500" />
                            ) : (
                              <div className="w-4 h-4 shrink-0 rounded-full border-2 border-gray-300 dark:border-gray-600" />
                            )}
                            {opt}
                            {isCorrect && <span className="ml-auto text-xs font-semibold opacity-60">Correct</span>}
                          </li>
                        )
                      })}
                    </ul>

                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500 dark:text-gray-400 pt-1">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" /> Trigger at {quiz.trigger_time}s
                      </span>
                    </div>

                    {quiz.explanation && (
                      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-lg p-3">
                        <p className="text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wide mb-1">Explanation</p>
                        <p className="text-sm text-blue-800 dark:text-blue-300">{quiz.explanation}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          {/* ── Assessments Tab ── */}
          <TabsContent value="assessments" className="mt-6 space-y-4">
            <div className="flex justify-end">
              <Button
                onClick={() => setIsAddingAssessment(true)}
                className="gap-2 bg-blue-600 hover:bg-blue-700 rounded-xl"
              >
                <Plus className="w-4 h-4" /> Add Question
              </Button>
            </div>

            {assessments.length === 0 ? (
              <div className="text-center py-16 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-dashed border-gray-300 dark:border-gray-700">
                <FileText className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                <p className="text-gray-500 dark:text-gray-400 font-medium">No assessment questions yet.</p>
                <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">Click "Add Question" to create one manually.</p>
              </div>
            ) : (
              assessments.map((assessment, index) => {
                const keywords = Array.isArray(assessment.options) ? assessment.options : []
                const isDeleting = deletingAssessmentId === assessment.uuid

                return (
                  <Card key={assessment.uuid || index} className="shadow-sm border-l-4 border-l-blue-400 border-gray-100 dark:border-gray-800 hover:shadow-md transition-shadow">
                    <CardHeader className="py-4 pb-2">
                      <div className="flex items-start justify-between gap-3">
                        <CardTitle className="text-base font-medium flex items-start gap-3 flex-1">
                          <span className="flex items-center justify-center bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300 w-6 h-6 rounded-full text-xs shrink-0 mt-0.5 font-semibold">
                            {index + 1}
                          </span>
                          <span className="text-gray-900 dark:text-white leading-snug">{assessment.question}</span>
                        </CardTitle>
                        <div className="flex items-center gap-1 shrink-0">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg"
                            onClick={() => setEditingAssessment(assessment)}
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
                            onClick={() => handleDeleteAssessment(assessment.uuid)}
                            disabled={isDeleting}
                          >
                            {isDeleting ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Trash2 className="w-4 h-4" />
                            )}
                          </Button>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2 pl-9 mt-2">
                        {assessment.type && (
                          <Badge variant="secondary" className="text-xs bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 border-0">
                            {assessment.type}
                          </Badge>
                        )}
                      </div>
                    </CardHeader>

                    <CardContent className="pt-2 pb-4 space-y-3 pl-9">
                      {keywords.length > 0 && (
                        <div>
                          <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                            Semantic Keywords
                          </p>
                          <div className="flex flex-wrap gap-1.5">
                            {keywords.map((kw, i) => (
                              <span
                                key={i}
                                className="text-xs bg-blue-50 text-blue-700 border border-blue-100 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-300 px-2.5 py-0.5 rounded-full"
                              >
                                {kw}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {assessment.explanation && (
                        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-xl p-3">
                          <p className="text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wide mb-1">
                            Explanation
                          </p>
                          <p className="text-sm text-blue-800 dark:text-blue-300">{assessment.explanation}</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )
              })
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Quiz Edit Modal */}
      {editingQuiz && (
        <QuizEditModal
          quiz={editingQuiz}
          onClose={() => setEditingQuiz(null)}
          onSave={handleSaveQuiz}
        />
      )}

      {/* Assessment Edit / Add Modal */}
      {(editingAssessment || isAddingAssessment) && (
        <AssessmentEditModal
          assessment={isAddingAssessment ? null : editingAssessment}
          videoId={videoId}
          isNew={isAddingAssessment}
          onClose={() => {
            setEditingAssessment(null)
            setIsAddingAssessment(false)
          }}
          onSaved={handleAssessmentSaved}
        />
      )}
    </ProtectedRoute>
  )
}
