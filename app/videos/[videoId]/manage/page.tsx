"use client"

import { useEffect, useState, useRef } from "react"
import { useRouter } from "next/navigation"
import { ProtectedRoute } from "@/lib/components/auth/ProtectedRoute"
import { Button } from "@/lib/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/lib/components/ui/card"
import { Input } from "@/lib/components/ui/input"
import { Label } from "@/lib/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/lib/components/ui/dialog"
import { Switch } from "@/lib/components/ui/switch"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/lib/components/ui/tooltip"
import {
  ArrowLeft, Loader2, Plus, HelpCircle, FileText, Pencil, Trash2,
  Save, X, CheckCircle2, Clock, Upload, AlertCircle, Info
} from "lucide-react"
import { toast } from "sonner"
import { videosApi, UpdateAssessmentPayload, CreateAssessmentPayload } from "@/lib/api/handle-videos"
import { categoriesApi, type CategoryItem } from "@/lib/api/categories"
import { Quiz, AssessmentQuestion, Video } from "@/lib/types/handle-videos"
import { cn } from "@/lib/utils"

// ─── Quiz Edit Modal ─────────────────────────────────────────────────────────

interface QuizEditState {
  trigger_time: number
  question: string
  options: string[]
  correct_answer: string
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
  correct_answer: string
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
    question: assessment?.question ?? "",
    correct_answer: assessment?.correct_answer ?? "",
  })
  const [isSaving, setIsSaving] = useState(false)

  const handleSave = async () => {
    if (!form.question.trim()) return

    setIsSaving(true)
    try {
      const payload: UpdateAssessmentPayload | CreateAssessmentPayload = {
        video_id: videoId,
        type: isNew ? "essay" : assessment!.type,
        question: form.question.trim(),
        correct_answer: form.correct_answer.trim() || null,
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
            {isNew ? "Add New Assessment Question" : "Edit Assessment Question"}
          </DialogTitle>
        </DialogHeader>

        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-5">
          <div className="space-y-1.5">
            <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Question <span className="text-red-500">*</span>
            </Label>
            <textarea
              value={form.question}
              onChange={(e) => setForm((prev) => ({ ...prev, question: e.target.value }))}
              rows={3}
              placeholder="Enter the assessment question..."
              className="w-full rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all resize-none"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Correct Answer
              <span className="ml-1.5 text-xs text-gray-400 font-normal">(Optional — used as the answer key)</span>
            </Label>
            <textarea
              value={form.correct_answer}
              onChange={(e) => setForm((prev) => ({ ...prev, correct_answer: e.target.value }))}
              rows={3}
              placeholder="Enter the expected correct answer or key points..."
              className="w-full rounded-xl bg-emerald-50/50 dark:bg-emerald-900/10 border border-emerald-200 dark:border-emerald-800 text-gray-900 dark:text-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all resize-none"
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

export default function ManageVideoPage({ params }: { params: { videoId: string } }) {
  const router = useRouter()
  const { videoId } = params

  const [isLoading, setIsLoading] = useState(true)
  const [video, setVideo] = useState<Video | null>(null)
  const [quizzes, setQuizzes] = useState<Quiz[]>([])
  const [assessments, setAssessments] = useState<AssessmentQuestion[]>([])
  const [categories, setCategories] = useState<CategoryItem[]>([])

  // Video Settings State
  const [titleInput, setTitleInput] = useState("")
  const [descriptionInput, setDescriptionInput] = useState("")
  const [categoryInput, setCategoryInput] = useState("")
  const [thumbnailFileInput, setThumbnailFileInput] = useState<File | null>(null)
  const [requireGrading, setRequireGrading] = useState(false)
  const [passingScore, setPassingScore] = useState("")
  const [isSavingVideo, setIsSavingVideo] = useState(false)
  const [videoError, setVideoError] = useState<string | null>(null)
  const thumbnailInputRef = useRef<HTMLInputElement>(null)

  // Quiz edit state
  const [editingQuiz, setEditingQuiz] = useState<Quiz | null>(null)
  const [isSavingQuizzes, setIsSavingQuizzes] = useState(false)

  // Assessment edit state
  const [editingAssessment, setEditingAssessment] = useState<AssessmentQuestion | null>(null)
  const [isAddingAssessment, setIsAddingAssessment] = useState(false)
  const [deletingAssessmentId, setDeletingAssessmentId] = useState<string | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [videoData, quizzesData, assessmentsData, categoriesData] = await Promise.all([
          videosApi.getVideoById(videoId),
          videosApi.getVideoQuizzes(videoId),
          videosApi.getVideoAssessments(videoId),
          categoriesApi.list(),
        ])

        setVideo(videoData)
        setQuizzes(quizzesData)
        setAssessments(assessmentsData)
        setCategories(categoriesData.data || [])

        setTitleInput(videoData.title)
        setDescriptionInput(videoData.description || "")
        setCategoryInput(typeof videoData.category === "string" ? videoData.category : (videoData.category?.id || ""))
        setRequireGrading(videoData.require_grading || false)
        setPassingScore(videoData.passing_score !== null && videoData.passing_score !== undefined ? String(videoData.passing_score) : "")
      } catch {
        toast.error("Failed to load video data")
      } finally {
        setIsLoading(false)
      }
    }
    fetchData()
  }, [videoId])

  const handleThumbnailSelection = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setVideoError("Maksimal ukuran foto adalah 5MB.")
        if (thumbnailInputRef.current) thumbnailInputRef.current.value = ""
        return
      }
      setVideoError(null)
      setThumbnailFileInput(file)
    }
  }

  const handleSaveVideoSettings = async () => {
    if (!video) return
    const title = titleInput.trim()
    if (!title) return setVideoError("Title is required.")

    setIsSavingVideo(true)
    setVideoError(null)

    try {
      await videosApi.updateVideo(video.id, {
        title,
        description: descriptionInput.trim() || undefined,
        category_id: categoryInput || undefined,
        thumbnail_file: thumbnailFileInput ?? undefined,
        require_grading: requireGrading,
        passing_score: requireGrading && passingScore ? parseInt(passingScore) : undefined,
      })
      toast.success("Video settings updated")
    } catch (err: any) {
      const msg = err?.response?.data?.message || (err instanceof Error ? err.message : "Edit failed")
      setVideoError(msg)
    } finally {
      setIsSavingVideo(false)
    }
  }

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
    setAssessments((prev) => {
      const idx = prev.findIndex(
        (a) => a.uuid.toLowerCase() === result.uuid.toLowerCase()
      )
      if (idx === -1) return [...prev, result]
      const next = [...prev]
      next[idx] = result
      return next
    })
    setEditingAssessment(null)
    setIsAddingAssessment(false)
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
    <ProtectedRoute>
      <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4 border-b border-gray-200 dark:border-gray-800 pb-6">
          <Button variant="outline" size="icon" onClick={() => router.back()} className="rounded-full shadow-sm shrink-0">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
              Manage Video & Assessments
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              Edit video metadata, interactive quizzes, and final assessment questions.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Column: Video Settings */}
          <div className="lg:col-span-4 space-y-6">
            <Card className="shadow-sm border-gray-200 dark:border-gray-800">
              <CardHeader className="pb-4 border-b border-gray-100 dark:border-gray-800">
                <CardTitle className="text-lg font-semibold flex items-center gap-2">
                  Video Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-5 pt-5">
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium">Video Title</Label>
                  <Input
                    value={titleInput}
                    onChange={(e) => setTitleInput(e.target.value)}
                    placeholder="Enter video title"
                    className="h-11 rounded-xl"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-sm font-medium">Description</Label>
                  <textarea
                    value={descriptionInput}
                    onChange={(e) => setDescriptionInput(e.target.value)}
                    placeholder="Optional description"
                    rows={4}
                    className="w-full rounded-xl bg-transparent border border-gray-200 dark:border-gray-800 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all resize-none shadow-sm"
                  ></textarea>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-sm font-medium">Category</Label>
                  <select
                    value={categoryInput}
                    onChange={(e) => setCategoryInput(e.target.value)}
                    className="w-full rounded-xl bg-transparent border border-gray-200 dark:border-gray-800 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all shadow-sm h-11"
                  >
                    <option value="" disabled>Select a category</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <Label className="text-sm font-medium">Update Thumbnail</Label>
                  <div
                    onClick={() => thumbnailInputRef.current?.click()}
                    className="relative mt-2 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-xl p-4 text-center cursor-pointer hover:border-blue-400 transition-colors"
                  >
                    <input
                      type="file"
                      ref={thumbnailInputRef}
                      onChange={handleThumbnailSelection}
                      accept="image/*"
                      className="hidden"
                    />
                    {thumbnailFileInput ? (
                      <div className="flex flex-col items-center">
                        <CheckCircle2 className="w-6 h-6 mx-auto mb-1 text-emerald-500" />
                        <p className="text-sm font-medium text-emerald-600 break-all">{thumbnailFileInput.name}</p>
                      </div>
                    ) : (
                      <>
                        <Upload className="w-5 h-5 mx-auto mb-1 text-gray-400" />
                        <p className="text-sm text-gray-500">Select a new thumbnail image</p>
                      </>
                    )}
                  </div>
                </div>

                {/* Completion Settings inside Video Settings */}
                <div className="pt-4 border-t border-gray-100 dark:border-gray-800 space-y-4">
                  <h3 className="font-semibold text-sm">Completion Requirements</h3>
                  <div className="flex items-center justify-between">
                    <Label className="flex items-center gap-1.5 text-sm font-medium">
                      Require Grading
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger type="button"><Info className="w-4 h-4 text-gray-400" /></TooltipTrigger>
                          <TooltipContent><p className="max-w-xs text-xs">Students must wait for your grade to complete.</p></TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </Label>
                    <Switch checked={requireGrading} onCheckedChange={setRequireGrading} />
                  </div>

                  {requireGrading && (
                    <div className="space-y-1.5 pt-2 animate-in fade-in slide-in-from-top-2">
                      <Label className="flex items-center gap-1.5 text-sm font-medium">
                        Minimum Passing Score
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger type="button"><Info className="w-4 h-4 text-gray-400" /></TooltipTrigger>
                            <TooltipContent><p className="max-w-xs text-xs">Score required to pass.</p></TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </Label>
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        value={passingScore}
                        onChange={(e) => setPassingScore(e.target.value)}
                        placeholder="e.g. 75"
                        className="h-11 rounded-xl"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        * Note: The total maximum score for the entire assessment is 100.
                      </p>
                    </div>
                  )}
                </div>

                {videoError && (
                  <p className="text-sm text-red-500 flex items-center gap-1.5">
                    <AlertCircle className="w-4 h-4 shrink-0" /> {videoError}
                  </p>
                )}

                <Button
                  onClick={handleSaveVideoSettings}
                  disabled={isSavingVideo}
                  className="w-full rounded-xl bg-blue-600 hover:bg-blue-700 h-11"
                >
                  {isSavingVideo ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save Video Settings"}
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Right Column: Quizzes and Assessments */}
          <div className="lg:col-span-8 space-y-8">
            {/* Quizzes Section */}
            <section>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold flex items-center gap-2">
                  <HelpCircle className="w-5 h-5 text-blue-500" /> Interactive Quizzes
                </h2>
              </div>
              <div className="space-y-4">
                {quizzes.length === 0 ? (
                  <div className="text-center py-10 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-dashed border-gray-300 dark:border-gray-700">
                    <HelpCircle className="w-8 h-8 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                    <p className="text-gray-500 dark:text-gray-400 font-medium">No quizzes generated yet.</p>
                  </div>
                ) : (
                  quizzes.map((quiz, index) => (
                    <Card key={quiz.id || index} className="shadow-sm border-gray-200 dark:border-gray-800 hover:shadow-md transition-shadow">
                      <CardHeader className="py-4 pb-3">
                        <div className="flex items-start justify-between gap-3">
                          <CardTitle className="text-sm font-medium flex items-start gap-2 flex-1">
                            <span className="shrink-0 tabular-nums">
                              {index + 1}.
                            </span>
                            <span className="leading-snug">{quiz.question}</span>
                          </CardTitle>
                          <Button variant="ghost" size="icon" className="shrink-0 h-8 w-8 rounded-lg" onClick={() => setEditingQuiz(quiz)}>
                            <Pencil className="w-4 h-4 text-gray-500" />
                          </Button>
                        </div>
                      </CardHeader>
                      <CardContent className="pt-0 pb-4 space-y-1 pl-12">
                        {quiz.options.map((opt, i) => {
                          const isCorrect = opt === quiz.correct_answer
                          return (
                            <div key={i} className="flex items-center gap-2 text-sm py-1">
                              {isCorrect
                                ? <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-emerald-500" />
                                : <div className="w-3.5 h-3.5 shrink-0 rounded-full border border-gray-300 dark:border-gray-600" />}
                              <span className={isCorrect ? "font-medium text-gray-900 dark:text-gray-100" : "text-gray-600 dark:text-gray-400"}>
                                {opt}
                              </span>
                            </div>
                          )
                        })}
                        <div className="flex items-center gap-1.5 text-xs text-gray-400 dark:text-gray-500 pt-3">
                          <Clock className="w-3.5 h-3.5" /> Triggers at {quiz.trigger_time}s
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </section>

            {/* Assessments Section */}
            <section>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold flex items-center gap-2">
                  Final Assessments
                </h2>
                <Button onClick={() => setIsAddingAssessment(true)} size="sm" className="rounded-xl gap-2 bg-blue-600 hover:bg-blue-700">
                  <Plus className="w-4 h-4" /> Add Question
                </Button>
              </div>
              <div className="space-y-4">
                {assessments.length === 0 ? (
                  <div className="text-center py-10 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-dashed border-gray-300 dark:border-gray-700">
                    <FileText className="w-8 h-8 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                    <p className="text-gray-500 dark:text-gray-400 font-medium">No assessment questions yet.</p>
                  </div>
                ) : (
                  assessments.map((assessment, index) => {
                    const isDeleting = deletingAssessmentId === assessment.uuid
                    return (
                      <Card key={assessment.uuid} className="shadow-sm border-gray-200 dark:border-gray-800 hover:shadow-md transition-shadow">
                        <CardHeader className="py-4 pb-2">
                          <div className="flex items-start justify-between gap-3">
                            <CardTitle className="text-sm font-medium flex items-start gap-2 flex-1">
                              <span className="shrink-0 tabular-nums">
                                {index + 1}.
                              </span>
                              <span className="leading-snug">{assessment.question}</span>
                            </CardTitle>
                            <div className="flex items-center gap-1 shrink-0">
                              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg" onClick={() => setEditingAssessment(assessment)}>
                                <Pencil className="w-4 h-4 text-gray-500" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-8 w-8 hover:text-red-600 rounded-lg" onClick={() => handleDeleteAssessment(assessment.uuid)} disabled={isDeleting}>
                                {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4 text-gray-400" />}
                              </Button>
                            </div>
                          </div>
                        </CardHeader>
                        {assessment.correct_answer && (
                          <CardContent className="pt-1 pb-4 pl-12">
                            <div className="bg-gray-50 dark:bg-gray-900/50 p-3 rounded-lg border border-gray-100 dark:border-gray-800">
                              <p className="text-xs text-gray-500 dark:text-gray-400 font-medium mb-1">Answer Key</p>
                              <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{assessment.correct_answer}</p>
                            </div>
                          </CardContent>
                        )}
                      </Card>
                    )
                  })
                )}
              </div>
            </section>
          </div>
        </div>
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
