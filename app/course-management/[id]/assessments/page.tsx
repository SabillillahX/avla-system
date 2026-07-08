"use client"

import React, { useState, useEffect } from "react"
import { Search, ChevronRight, PlayCircle, ArrowLeft, CheckCircle2, Loader2, XCircle, MinusCircle, Check, ChevronsUpDown, Menu, X, Save } from "lucide-react"
import { useParams, useRouter } from "next/navigation"
import { classesApi } from "@/lib/api/classes"
import { assessmentApi } from "@/lib/api/assessment"
import { toast } from "sonner"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export default function AssessmentGradingPage() {
  const { id: classId } = useParams()
  const router = useRouter()

  const [view, setView] = useState<"dashboard" | "workspace">("dashboard")
  const [searchQuery, setSearchQuery] = useState("")

  const [course, setCourse] = useState<any>(null)
  const [students, setStudents] = useState<any[]>([])
  const [totalQuestions, setTotalQuestions] = useState(0)
  const [isLoading, setIsLoading] = useState(true)

  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null)
  const [selectedVideoId, setSelectedVideoId] = useState<string | null>(null)
  const [selectedBatchId, setSelectedBatchId] = useState<string>("all")
  const [isBatchPopoverOpen, setIsBatchPopoverOpen] = useState(false)
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false)

  const [gradingState, setGradingState] = useState<Record<string, {
    score: number | null;
    feedback: string;
    is_correct: boolean | null;
  }>>({})
  const [isSubmitting, setIsSubmitting] = useState<string | null>(null)

  useEffect(() => {
    if (classId) {
      fetchData()
    }
  }, [classId, selectedBatchId])

  const fetchData = async () => {
    try {
      setIsLoading(true)
      const batchParam = selectedBatchId === "all" ? undefined : selectedBatchId;
      const [courseRes, answersRes] = await Promise.all([
        classesApi.get(classId as string),
        assessmentApi.getStudentAnswersByClass(classId as string, batchParam)
      ])

      setCourse(courseRes.data)
      setTotalQuestions(answersRes.total_questions || 0)

      const allStudents = (answersRes.data || []).map((s: any) => ({
        ...s,
        answers: Array.isArray(s.answers) ? s.answers : (s.answers?.data ?? [])
      }))
      setStudents(allStudents)

      const initialGradingState: Record<string, any> = {}
      allStudents.forEach((student: any) => {
        (student.answers || []).forEach((ans: any) => {
          initialGradingState[ans.id] = {
            score: ans.score !== null && ans.score !== undefined ? Number(ans.score) : null,
            feedback: ans.feedback || "",
            is_correct: ans.is_correct
          }
        })
      })
      setGradingState(initialGradingState)
    } catch (err: any) {
      toast.error("Failed to load assessment data")
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmitFinalAssessment = async (answers: any[], maxScorePerQuestion: number) => {
    try {
      setIsSubmitting("bulk")
      // Submit all graded answers for the current video
      await Promise.all(
        answers.map((ans) => {
          const state = gradingState[ans.id]
          if (state.score === null) return Promise.resolve()

          let is_correct = null
          if (maxScorePerQuestion > 0) {
            if (state.score === maxScorePerQuestion) is_correct = true
            else if (state.score === 0) is_correct = false
          }

          return assessmentApi.gradeAnswer(ans.id, {
            score: state.score,
            feedback: state.feedback || null,
            is_correct
          })
        })
      )
      toast.success("Final Assessment grades submitted successfully!")
      await fetchData()
    } catch (err: any) {
      toast.error("Failed to submit grades. Please try again.")
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
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 gap-3 text-indigo-600">
        <Loader2 className="w-8 h-8 animate-spin" />
        <span className="font-medium text-gray-600">Loading assessments...</span>
      </div>
    )
  }

  const trimmedSearch = searchQuery.trim().toLowerCase()
  const filteredStudents = students.filter(s => {
    const matchesBatch = selectedBatchId === "all" || s.user.batch_id === selectedBatchId;
    if (!matchesBatch) return false;

    if (!trimmedSearch) return true;
    const matchesSearch = s.user.name.toLowerCase().includes(trimmedSearch) ||
      s.user.email.toLowerCase().includes(trimmedSearch);
    return matchesSearch;
  })

  const selectedBatchName = selectedBatchId === "all"
    ? "All Batches"
    : course?.batches?.find((b: any) => b.id === selectedBatchId)?.name || "All Batches"

  const getPendingVideoCount = (student: any) => {
    const answers = student.answers || []
    const videoIds = Array.from(new Set(answers.map((a: any) => a.question?.video_id).filter(Boolean)))

    let count = 0
    videoIds.forEach(vid => {
      const vidAnswers = answers.filter((a: any) => a.question?.video_id === vid)
      const hasGrades = vidAnswers.some((a: any) => a.score !== null && a.score !== undefined)
      if (!hasGrades) {
        count++
      }
    })
    return count
  }

  const renderDashboard = () => (
    <div className="p-6 space-y-6 bg-gray-50 min-h-screen font-sans">
      <div className="mb-2">
        <button
          onClick={() => router.back()}
          className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-indigo-600 transition-colors focus:outline-none"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          Back
        </button>
      </div>

      <div className="flex flex-col xl:flex-row gap-4 items-start xl:items-center justify-between bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
        <div className="relative w-full xl:w-96 shrink-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search Student Name..."
            className="pl-9 pr-4 py-2.5 w-full border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all text-sm"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="flex flex-col sm:flex-row gap-4 w-full xl:w-auto">
          {/* Batch Search / Combobox */}
          <Popover open={isBatchPopoverOpen} onOpenChange={setIsBatchPopoverOpen}>
            <PopoverTrigger asChild>
              <button
                role="combobox"
                aria-expanded={isBatchPopoverOpen}
                className="w-full sm:w-[280px] md:w-[320px] flex items-center justify-between border border-gray-200 rounded-xl px-4 py-2.5 bg-white text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-sm font-medium"
              >
                <span className="truncate pr-2 text-left">
                  {selectedBatchName}
                </span>
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-full sm:w-[280px] md:w-[320px] p-0 rounded-xl border-gray-200 shadow-lg" align="end">
              <Command filter={(value, search) => {
                if (value.toLowerCase().includes(search.trim().toLowerCase())) return 1;
                return 0;
              }}>
                <CommandInput placeholder="Search batch..." className="h-11 border-none focus:ring-0" />
                <CommandList className="max-h-[240px] p-1 overflow-y-auto">
                  <CommandEmpty className="py-6 text-center text-sm text-gray-500">No batch found.</CommandEmpty>
                  <CommandGroup>
                    <CommandItem
                      value="All Batches"
                      onSelect={() => {
                        setSelectedBatchId("all")
                        setIsBatchPopoverOpen(false)
                      }}
                      className="flex items-center gap-2 px-3 py-2.5 rounded-lg cursor-pointer aria-selected:bg-indigo-50 aria-selected:text-indigo-900"
                    >
                      <span className="break-words line-clamp-2 w-full text-left text-sm leading-tight">All Batches</span>
                      {selectedBatchId === "all" && (
                        <Check className="ml-auto h-4 w-4 text-indigo-600 shrink-0" />
                      )}
                    </CommandItem>
                    {course?.batches?.map((b: any) => (
                      <CommandItem
                        key={b.id}
                        value={b.name}
                        onSelect={() => {
                          setSelectedBatchId(b.id)
                          setIsBatchPopoverOpen(false)
                        }}
                        className="flex items-center gap-2 px-3 py-2.5 rounded-lg cursor-pointer aria-selected:bg-indigo-50 aria-selected:text-indigo-900"
                      >
                        <span className="break-words line-clamp-2 w-full text-left text-sm leading-tight">{b.name}</span>
                        {selectedBatchId === b.id && (
                          <Check className="ml-auto h-4 w-4 text-indigo-600 shrink-0" />
                        )}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/50 border-b border-gray-100">
                <th className="px-6 py-4 font-semibold text-gray-700 text-sm">Student Name</th>
                <th className="px-6 py-4 font-semibold text-gray-700 text-sm">Course Name</th>
                <th className="px-6 py-4 font-semibold text-gray-700 text-sm text-center">Failed Assessments</th>
                <th className="px-6 py-4 font-semibold text-gray-700 text-sm text-center">Pending Evaluations</th>
                <th className="px-6 py-4 font-semibold text-gray-700 text-sm text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                    <div className="flex flex-col items-center gap-2">
                      <Search className="w-8 h-8 text-gray-300" />
                      <p>No students found matching your search.</p>
                    </div>
                  </td>
                </tr>
              ) : filteredStudents.map((student) => {
                const pendingCount = getPendingVideoCount(student)
                return (
                  <tr key={student.user.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors last:border-0 group">
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="font-medium text-gray-900 group-hover:text-indigo-600 transition-colors">{student.user.name}</span>
                        <span className="text-sm text-gray-500">{student.user.email}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-gray-600 text-sm">{course?.name}</td>
                    <td className="px-6 py-4 text-center">
                      {student.failed_videos_count > 0 ? (
                        <div className="flex flex-col items-center">
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-white text-red-600 border border-gray-200 shadow-sm">
                            Failed {student.failed_videos_count} Video{student.failed_videos_count > 1 ? 's' : ''}
                          </span>
                          <span className="text-[10px] text-gray-500 mt-1">
                            in {student.failed_chapters_count} Chapter{student.failed_chapters_count > 1 ? 's' : ''}
                          </span>
                        </div>
                      ) : (
                        <span className="text-sm text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center">
                      {pendingCount > 0 ? (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-white text-red-600 border border-gray-200 shadow-sm">
                          {pendingCount} Pending
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-white text-emerald-600 border border-gray-200 shadow-sm">
                          Up to date
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => {
                          setSelectedStudentId(student.user.id)
                          setView("workspace")
                        }}
                        className="inline-flex items-center justify-center px-5 py-2 text-sm font-semibold text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors shadow-sm"
                      >
                        Grade Now
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        <div className="md:hidden divide-y divide-gray-100">
          {filteredStudents.length === 0 ? (
            <div className="px-5 py-12 text-center text-gray-500">
              <div className="flex flex-col items-center gap-2">
                <Search className="w-8 h-8 text-gray-300" />
                <p>No students found matching your search.</p>
              </div>
            </div>
          ) : filteredStudents.map((student) => {
            const pendingCount = getPendingVideoCount(student)
            return (
              <div key={student.user.id} className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium text-gray-900 truncate">{student.user.name}</p>
                    <p className="text-sm text-gray-500 truncate">{student.user.email}</p>
                    {student.failed_videos_count > 0 && (
                      <p className="text-xs font-semibold text-red-600 mt-1">
                        Failed {student.failed_videos_count} Video{student.failed_videos_count > 1 ? 's' : ''} (in {student.failed_chapters_count} Chapter{student.failed_chapters_count > 1 ? 's' : ''})
                      </p>
                    )}
                  </div>
                  {pendingCount > 0 ? (
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-white text-red-600 border border-gray-200 shadow-sm shrink-0">
                      {pendingCount}
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-white text-emerald-600 border border-gray-200 shadow-sm shrink-0">
                      ✓
                    </span>
                  )}
                </div>
                <button
                  onClick={() => {
                    setSelectedStudentId(student.user.id)
                    setView("workspace")
                  }}
                  className="w-full inline-flex items-center justify-center px-4 py-2.5 text-sm font-semibold text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 transition-colors shadow-sm"
                >
                  Grade Now
                </button>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )

  const renderWorkspace = () => {
    const student = students.find(s => s.user.id === selectedStudentId)
    if (!student) return null

    const studentAnswers = student.answers || []

    const isVideoPending = (vid: string) => {
      const answersForVid = studentAnswers.filter((ans: any) => ans.question?.video_id === vid)
      if (answersForVid.length === 0) return false
      const hasGrades = answersForVid.some((ans: any) => ans.score !== null && ans.score !== undefined)
      return !hasGrades
    }

    const currentVideoAnswers = selectedVideoId
      ? studentAnswers.filter((ans: any) => ans.question?.video_id === selectedVideoId)
      : []

    let selectedChapterName = ""
    let selectedVideoName = ""
    let selectedPassingScore = 75 // default
    course?.sections?.forEach((sec: any) => {
      sec.videos?.forEach((vid: any) => {
        if (vid.id === selectedVideoId) {
          selectedChapterName = sec.title
          selectedVideoName = vid.title
          if (vid.passing_score !== undefined && vid.passing_score !== null) {
            selectedPassingScore = vid.passing_score
          }
        }
      })
    })

    const maxScorePerQuestion = currentVideoAnswers.length > 0 ? Math.floor(100 / currentVideoAnswers.length) : 0
    const gradedAnswersCount = currentVideoAnswers.filter((ans: any) => gradingState[ans.id]?.score !== null).length
    const isAllGraded = currentVideoAnswers.length > 0 && gradedAnswersCount === currentVideoAnswers.length
    const currentTotalScore = currentVideoAnswers.reduce((sum: number, ans: any) => sum + (gradingState[ans.id]?.score || 0), 0)

    const isDirty = currentVideoAnswers.some((ans: any) => {
      const state = gradingState[ans.id]
      const origScore = ans.score !== null && ans.score !== undefined ? Number(ans.score) : null
      const origFeedback = ans.feedback || ""
      return state?.score !== origScore || state?.feedback !== origFeedback
    })

    const hasGrades = currentVideoAnswers.some((ans: any) => ans.score !== null && ans.score !== undefined)

    const sidebarContent = (
      <>
        <div className="p-4 border-b border-gray-100 flex items-center gap-3 sticky top-0 bg-white z-10">
          <button
            onClick={() => {
              setView("dashboard")
              setSelectedStudentId(null)
              setSelectedVideoId(null)
              setIsMobileSidebarOpen(false)
            }}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <span className="font-semibold text-lg text-gray-900">Chapters</span>
          <button
            onClick={() => setIsMobileSidebarOpen(false)}
            className="ml-auto p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors md:hidden focus:outline-none"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-4 space-y-3">
          {course?.sections?.map((chapter: any) => (
            <details key={chapter.id} open className="group border border-gray-200 bg-gray-50/50 rounded-lg shadow-sm">
              <summary className="flex items-center justify-between p-3 text-sm font-semibold text-gray-800 cursor-pointer list-none hover:bg-gray-100/50 transition-colors rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500">
                {chapter.title}
                <ChevronRight className="w-4 h-4 text-gray-500 transition-transform group-open:rotate-90" />
              </summary>
              <div className="px-2 pb-2 space-y-1 mt-1">
                {chapter.videos?.map((video: any) => {
                  const pending = isVideoPending(video.id)
                  const isActive = selectedVideoId === video.id
                  return (
                    <button
                      key={video.id}
                      onClick={() => {
                        setSelectedVideoId(video.id)
                        setIsMobileSidebarOpen(false)
                      }}
                      className={`w-full flex items-center justify-between p-2 rounded-md focus:outline-none transition-colors text-left group/btn ${isActive ? 'bg-indigo-50 text-indigo-700' : 'hover:bg-gray-100 text-gray-600'
                        }`}
                    >
                      <div className={`flex items-center gap-2 ${isActive ? 'text-indigo-700' : 'group-hover/btn:text-indigo-600'}`}>
                        <PlayCircle className="w-4 h-4 shrink-0" />
                        <span className="text-sm truncate">{video.title}</span>
                      </div>
                      {pending && (
                        <div className="w-2 h-2 rounded-full bg-red-500 shrink-0 shadow-sm" />
                      )}
                    </button>
                  )
                })}
              </div>
            </details>
          ))}
        </div>
      </>
    )

    return (
      <div className="flex h-screen bg-gray-50 overflow-hidden font-sans">
        <div className="hidden md:flex w-80 bg-white border-r border-gray-200 flex-col h-full overflow-y-auto shrink-0">
          {sidebarContent}
        </div>

        {isMobileSidebarOpen && (
          <div className="fixed inset-0 z-50 md:hidden">
            <div className="absolute inset-0 bg-black/40" onClick={() => setIsMobileSidebarOpen(false)} />
            <div className="absolute inset-y-0 left-0 w-80 max-w-[85vw] bg-white flex flex-col overflow-y-auto shadow-xl animate-in slide-in-from-left duration-200">
              {sidebarContent}
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-4 md:p-8 scroll-smooth">
          <div className="max-w-4xl mx-auto space-y-6 md:space-y-8">
            <div className="bg-white p-4 md:p-6 rounded-2xl shadow-sm border border-gray-100">
              <div className="flex items-center gap-3 mb-3 md:hidden">
                <button
                  onClick={() => setIsMobileSidebarOpen(true)}
                  className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors focus:outline-none"
                >
                  <Menu className="w-5 h-5" />
                </button>
                <span className="text-sm font-medium text-gray-500">Chapters</span>
              </div>
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div className="min-w-0">
                  <h2 className="text-xl md:text-2xl font-bold text-gray-900">
                    {student.user.name}
                  </h2>
                  <div className="flex flex-wrap items-center gap-1.5 text-gray-500 mt-1 text-sm font-medium">
                    {selectedVideoId ? (
                      <>
                        <span className="truncate max-w-[120px] md:max-w-none">{selectedChapterName}</span>
                        <ChevronRight className="w-4 h-4 shrink-0" />
                        <span className="text-indigo-600 truncate max-w-[140px] md:max-w-none">{selectedVideoName}</span>
                      </>
                    ) : (
                      <span>Select a video from the sidebar to view answers</span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {selectedVideoId && (
              <>
                <div className="space-y-4 md:space-y-6">
                  {currentVideoAnswers.length === 0 ? (
                    <div className="text-center py-12 bg-white rounded-2xl border border-gray-100 shadow-sm">
                      <p className="text-gray-500 font-medium">No questions answered in this video yet.</p>
                    </div>
                  ) : (
                    <div className="space-y-6 pb-24">
                      {currentVideoAnswers.map((ans: any, index: number) => {
                        const state = gradingState[ans.id] || { score: null, feedback: "", is_correct: null }
                        return (
                          <div key={ans.id} className="bg-white border border-gray-200 shadow-sm overflow-hidden rounded-xl flex flex-col transition-shadow hover:shadow-md">
                            {/* Question Section */}
                            <div className="p-5 md:p-6 bg-white border-b border-gray-100">
                              <div className="min-w-0 flex-1">
                                <h3 className="font-semibold text-gray-900 text-base leading-snug break-words">
                                  {index + 1}. {ans.question?.question}
                                </h3>
                              </div>
                            </div>

                            {/* Answer Section */}
                            <div className="p-5 md:p-6 bg-gray-50/50 border-b border-gray-100">
                              <div className="flex gap-3 items-start">
                                <div className="flex-1 min-w-0">
                                  <span className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 block">Student's Answer</span>
                                  <p className="text-gray-800 leading-relaxed whitespace-pre-line break-words text-sm md:text-base">
                                    {ans.user_answer || <span className="italic text-gray-400">No answer provided</span>}
                                  </p>
                                </div>
                              </div>
                            </div>

                            {/* Reference Answer */}
                            {ans.question?.correct_answer && (
                              <div className="p-5 md:p-6 bg-blue-50/30 border-b border-blue-100/50">
                                <div className="flex gap-3 items-start">
                                  <div className="flex-1 min-w-0">
                                    <span className="text-xs font-bold text-blue-800 uppercase tracking-wider mb-2 block">Reference / Correct Answer</span>
                                    <p className="text-blue-900/90 leading-relaxed text-sm whitespace-pre-line break-words">
                                      {ans.question.correct_answer}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* AI Suggestion Section */}
                            {(ans.ai_score_suggestion !== null && ans.ai_score_suggestion !== undefined) && (
                              <div className="p-5 md:p-6 bg-purple-50/50 border-b border-purple-100/50 flex flex-col sm:flex-row justify-between gap-4">
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-2">
                                    <span className="text-xs font-bold text-purple-800 uppercase tracking-wider block">AI Suggestion</span>
                                    <span className="px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 text-xs font-bold">
                                      Score: {ans.ai_score_suggestion}
                                    </span>
                                  </div>
                                  <p className="text-purple-900/90 leading-relaxed text-sm whitespace-pre-line break-words">
                                    {ans.ai_feedback_suggestion || <span className="italic">No feedback provided.</span>}
                                  </p>
                                </div>
                                <div className="shrink-0 flex items-start mt-2 sm:mt-0">
                                  <button
                                    onClick={() => {
                                      updateState(ans.id, 'score', ans.ai_score_suggestion);
                                      if (ans.ai_feedback_suggestion) {
                                        updateState(ans.id, 'feedback', ans.ai_feedback_suggestion);
                                      }
                                    }}
                                    className="px-4 py-2 text-xs font-semibold text-purple-700 bg-purple-100 hover:bg-purple-200 rounded-lg transition-colors shadow-sm"
                                  >
                                    Apply Suggestion
                                  </button>
                                </div>
                              </div>
                            )}

                            {/* Teacher Evaluation Section */}
                            <div className="p-5 md:p-6 bg-white">

                              <div className="flex flex-col md:flex-row gap-6 md:gap-8">
                                {/* Left column: Score */}
                                <div className="w-full md:w-1/3">
                                  <label className="font-semibold text-gray-700 text-sm block mb-2">Score</label>
                                  <div className="flex items-center gap-3">
                                    <input
                                      type="number"
                                      min={0}
                                      max={maxScorePerQuestion}
                                      value={state.score !== null ? state.score : ""}
                                      onChange={(e) => {
                                        const raw = e.target.value
                                        if (raw === "") {
                                          updateState(ans.id, 'score', null)
                                        } else {
                                          const num = parseInt(raw, 10)
                                          if (!isNaN(num) && num >= 0 && num <= maxScorePerQuestion) {
                                            updateState(ans.id, 'score', num)
                                          }
                                        }
                                      }}
                                      className={`w-32 px-3 py-2.5 border rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-medium text-center ${state.score !== null ? 'border-indigo-300 ring-1 ring-indigo-300' : 'border-gray-200'
                                        }`}
                                    />
                                    <span className="text-gray-400 text-sm font-semibold">/ {maxScorePerQuestion}</span>
                                  </div>
                                </div>

                                {/* Right column: Feedback */}
                                <div className="w-full md:w-2/3 flex flex-col h-full">
                                  <label className="font-semibold text-gray-700 text-sm block mb-2">Feedback <span className="text-gray-400 font-normal text-xs">(Optional)</span></label>
                                  <textarea
                                    value={state.feedback}
                                    onChange={(e) => updateState(ans.id, 'feedback', e.target.value)}
                                    placeholder="Add helpful feedback for the student..."
                                    className="flex-1 w-full min-h-[120px] px-4 py-3 border border-gray-200 rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all resize-y text-sm"
                                  />
                                </div>
                              </div>
                            </div>
                          </div>
                        )
                      })}

                      {/* Sticky Summary Bar */}
                      <div className="fixed bottom-0 left-0 right-0 md:left-80 z-50 bg-white border-t border-gray-200 p-4 shadow-[0_-4px_10px_rgba(0,0,0,0.05)] animate-in slide-in-from-bottom-4">
                        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">

                          <div className="flex items-center gap-6 w-full sm:w-auto">
                            <div className="space-y-1">
                              <span className="text-xs font-bold text-gray-500 uppercase tracking-wider block">Student</span>
                              <p className="font-semibold text-gray-900 truncate max-w-[120px] sm:max-w-[150px]">{student.user.name}</p>
                            </div>

                            <div className="h-10 w-px bg-gray-200 hidden sm:block"></div>



                            <div className="space-y-1">
                              <span className="text-xs font-bold text-gray-500 uppercase tracking-wider block flex items-center gap-1.5">
                                Current Score
                                {selectedPassingScore > 0 && <span className="text-[10px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded font-semibold">Pass: {selectedPassingScore}</span>}
                              </span>
                              <p className={`font-bold text-lg leading-none ${currentTotalScore >= selectedPassingScore ? 'text-emerald-600' : 'text-gray-900'}`}>
                                {currentTotalScore} <span className="text-gray-400 font-medium text-sm">/ 100</span>
                              </p>
                            </div>
                          </div>

                          <button
                            onClick={() => handleSubmitFinalAssessment(currentVideoAnswers, maxScorePerQuestion)}
                            disabled={isSubmitting === "bulk" || !isDirty}
                            className="w-full sm:w-auto inline-flex items-center justify-center px-6 py-3 text-sm font-bold text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 focus:outline-none focus:ring-4 focus:ring-indigo-100 transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-indigo-600"
                          >
                            {isSubmitting === "bulk" ? (
                              <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Submitting...</>
                            ) : (
                              <><Save className="w-5 h-5 mr-2" /> {hasGrades ? (isDirty ? "Resubmit" : "Submitted") : "Submit Final Assessment"}</>
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {view === "dashboard" ? renderDashboard() : renderWorkspace()}
    </div>
  )
}
