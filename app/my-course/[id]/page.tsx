"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { ProtectedRoute } from "@/components/auth/ProtectedRoute"
import { classesApi, type CourseClass } from "@/lib/api/classes"
import {
  PlayCircle, CheckCircle2, LayoutList, Trophy, ArrowLeft,
  Loader2, BookOpen, Lock, HelpCircle, FileText, GraduationCap,
} from "lucide-react"
import { getImageUrl } from "@/lib/class-utils"
import { cn } from "@/lib/utils"

import { VideoWithCompletion } from "@/lib/types/my-course"

function computeCourseProgress(sections: any[]): {
  totalVideos: number
  completedVideos: number
  percent: number
} {
  let totalVideos = 0
  let completedVideos = 0

  for (const section of sections) {
    for (const video of section.videos || []) {
      totalVideos++
      if (video.is_completed) completedVideos++
    }
  }

  const percent = totalVideos > 0 ? Math.round((completedVideos / totalVideos) * 100) : 0
  return { totalVideos, completedVideos, percent }
}

function VideoCompletionBadges({ video }: { video: VideoWithCompletion }) {
  const hasQuiz = video.quiz_count > 0
  const hasAssessment = video.assessment_count > 0

  if (!hasQuiz && !hasAssessment) return null

  return (
    <div className="flex flex-wrap gap-1.5 mt-2">
      {hasQuiz && (
        <span className={cn(
          "inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full",
          video.is_quiz_done
            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
            : "bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
        )}>
          <HelpCircle className="w-3 h-3" />
          Quiz {video.quiz_done_count}/{video.quiz_count}
        </span>
      )}
      {hasAssessment && (
        <span className={cn(
          "inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full",
          video.is_assessment_done
            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
            : "bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
        )}>
          <FileText className="w-3 h-3" />
          Assessment {video.assessment_done_count}/{video.assessment_count}
        </span>
      )}
    </div>
  )
}

export default function CourseMaterialPage({ params }: { params: { id: string } }) {
  const [course, setCourse] = useState<CourseClass | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const loadCourse = async () => {
      try {
        const response = await classesApi.get(params.id)
        setCourse(response.data)
      } finally {
        setIsLoading(false)
      }
    }
    loadCourse()
  }, [params.id])

  if (isLoading) {
    return (
      <ProtectedRoute>
        <div className="flex items-center justify-center min-h-[50vh]">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        </div>
      </ProtectedRoute>
    )
  }

  if (!course) {
    return (
      <ProtectedRoute>
        <div className="p-6 text-center">
          <BookOpen className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Course not found</h1>
          <p className="text-gray-600 dark:text-gray-400 mb-6">We could not find the course you are looking for.</p>
          <Link href="/my-course">
            <Button variant="outline" className="gap-2">
              <ArrowLeft className="w-4 h-4" /> Back to My Courses
            </Button>
          </Link>
        </div>
      </ProtectedRoute>
    )
  }

  const sections = course.sections || []
  const { totalVideos, completedVideos, percent } = computeCourseProgress(sections)

  return (
    <ProtectedRoute>
      <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6">

        {/* Header */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Link href="/my-course">
              <Button variant="ghost" size="sm" className="h-8 gap-1 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white">
                <ArrowLeft className="w-4 h-4" /> Back
              </Button>
            </Link>
            <span className="text-sm font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-2.5 py-0.5 rounded-full">
              {course.category?.name || "General"}
            </span>
            {course.level && (
              <Badge variant="secondary" className="bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300">
                {course.level}
              </Badge>
            )}
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-2 tracking-tight">
            {course.name}
          </h1>
          <p className="text-gray-600 dark:text-gray-400 max-w-3xl text-sm">
            {course.short_description || "Select a video from the curriculum below to start learning."}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 xl:grid-cols-4 gap-8">

          {/* Main curriculum */}
          <div className="lg:col-span-2 xl:col-span-3 space-y-6">

            {/* Learning objectives */}
            {(course.what_you_will_learn ?? []).filter(Boolean).length > 0 && (
              <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-6 shadow-sm">
                <div className="flex items-center gap-2 mb-4 border-b border-gray-100 dark:border-gray-800 pb-4">
                  <GraduationCap className="w-5 h-5 text-blue-500" />
                  <h3 className="text-base font-bold text-gray-900 dark:text-white">What You'll Learn</h3>
                </div>
                <div className="space-y-2.5">
                  {(course.what_you_will_learn ?? []).filter(Boolean).map((item, i) => (
                    <div key={i} className="flex items-start gap-2.5">
                      <span className="flex items-center justify-center shrink-0 w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 text-xs font-bold mt-0.5">
                        {i + 1}
                      </span>
                      <span className="text-sm text-gray-700 dark:text-gray-300">{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Overall progress bar */}
            {totalVideos > 0 && (
              <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-5 shadow-sm space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-semibold text-gray-900 dark:text-white">Course Progress</span>
                  <span className={cn(
                    "font-bold text-base",
                    percent === 100 ? "text-emerald-600 dark:text-emerald-400" : "text-blue-600 dark:text-blue-400"
                  )}>
                    {percent}%
                  </span>
                </div>
                <Progress value={percent} className="h-2.5" />
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {completedVideos} of {totalVideos} videos completed — all quizzes & assessments must be done
                </p>
              </div>
            )}

            {/* Curriculum sections */}
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-6 sm:p-8 shadow-sm">
              <div className="flex items-center gap-2 mb-6 border-b border-gray-100 dark:border-gray-800 pb-4">
                <LayoutList className="w-5 h-5 text-gray-500" />
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">Course Curriculum</h3>
              </div>

              <div className="space-y-8">
                {sections.length > 0 ? (
                  sections.map((section: any, idx: number) => {
                    const sectionVideos: VideoWithCompletion[] = section.videos || []
                    const sectionTotal = sectionVideos.length
                    const sectionDone = sectionVideos.filter((v) => v.is_completed).length
                    const sectionPercent = sectionTotal > 0 ? Math.round((sectionDone / sectionTotal) * 100) : 0

                    return (
                      <div key={section.id} className="space-y-3">
                        {/* Section header */}
                        <div className="flex items-center gap-3 bg-gray-50 dark:bg-gray-800/50 p-4 rounded-xl border border-gray-100 dark:border-gray-800">
                          <span className="flex items-center justify-center bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 w-9 h-9 rounded-lg text-sm font-bold shrink-0 shadow-sm">
                            {idx + 1}
                          </span>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-semibold text-gray-900 dark:text-white text-base">{section.title}</h4>
                            {sectionTotal > 0 && (
                              <div className="flex items-center gap-2 mt-1">
                                <Progress value={sectionPercent} className="h-1.5 flex-1 max-w-[120px]" />
                                <span className="text-xs text-gray-500 dark:text-gray-400 shrink-0">
                                  {sectionDone}/{sectionTotal} done
                                </span>
                              </div>
                            )}
                          </div>
                          {sectionDone === sectionTotal && sectionTotal > 0 && (
                            <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                          )}
                        </div>

                        {/* Videos */}
                        <div className="space-y-3 pl-2 sm:pl-4">
                          {sectionVideos.length > 0 ? (
                            sectionVideos.map((video, vIdx) => (
                              <Link href={`/my-course/${params.id}/video/${video.id}`} key={video.id} className="block group">
                                <div className={cn(
                                  "flex flex-col sm:flex-row gap-4 p-4 sm:p-5 rounded-xl cursor-pointer transition-all duration-200 border",
                                  video.is_completed
                                    ? "bg-emerald-50/50 dark:bg-emerald-900/10 border-emerald-100 dark:border-emerald-900/30 hover:border-emerald-200 dark:hover:border-emerald-800"
                                    : "bg-white dark:bg-gray-900 border-gray-100 dark:border-gray-800 hover:border-blue-200 dark:hover:border-blue-800 hover:shadow-md hover:ring-1 hover:ring-blue-100 dark:hover:ring-blue-900"
                                )}>
                                  {/* Thumbnail */}
                                  <div className="w-full sm:w-40 aspect-video bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden shrink-0 relative shadow-sm">
                                    {video.thumbnail_path ? (
                                      <img
                                        src={getImageUrl(video.thumbnail_path) || undefined}
                                        alt={video.title}
                                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                                      />
                                    ) : (
                                      <div className="w-full h-full flex items-center justify-center">
                                        <PlayCircle className="w-8 h-8 text-gray-300 dark:text-gray-600" />
                                      </div>
                                    )}
                                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                                      <PlayCircle className="w-9 h-9 text-white opacity-0 group-hover:opacity-100 transition-all duration-300 scale-75 group-hover:scale-100 drop-shadow-lg" />
                                    </div>
                                    {/* Completion overlay */}
                                    {video.is_completed && (
                                      <div className="absolute top-2 right-2">
                                        <div className="w-6 h-6 bg-emerald-500 rounded-full flex items-center justify-center shadow">
                                          <CheckCircle2 className="w-4 h-4 text-white" />
                                        </div>
                                      </div>
                                    )}
                                  </div>

                                  {/* Info */}
                                  <div className="flex-1 min-w-0 flex flex-col justify-center py-1">
                                    <div className="flex items-start justify-between gap-2">
                                      <h5 className={cn(
                                        "font-semibold text-base line-clamp-2 leading-snug mb-1 transition-colors",
                                        video.is_completed
                                          ? "text-emerald-700 dark:text-emerald-400"
                                          : "text-gray-900 dark:text-gray-100 group-hover:text-blue-600 dark:group-hover:text-blue-400"
                                      )}>
                                        {vIdx + 1}. {video.title}
                                      </h5>
                                    </div>
                                    <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2 mb-2">
                                      {video.description || "No description provided."}
                                    </p>
                                    <VideoCompletionBadges video={video} />
                                    {!video.is_completed && (
                                      <div className="flex items-center gap-1.5 mt-2 text-xs font-medium text-blue-600 dark:text-blue-400">
                                        <PlayCircle className="w-3.5 h-3.5" />
                                        Watch &amp; complete quizzes to mark done
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </Link>
                            ))
                          ) : (
                            <p className="text-sm text-gray-500 italic pl-4 py-2">No videos in this section yet.</p>
                          )}
                        </div>
                      </div>
                    )
                  })
                ) : (
                  <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-8">
                    Course curriculum is being prepared.
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1 space-y-6">
            <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 shadow-sm sticky top-6">
              <CardContent className="p-6 space-y-6">

                {/* Progress ring summary */}
                {totalVideos > 0 && (
                  <div className="text-center pb-5 border-b border-gray-100 dark:border-gray-800">
                    <div className="relative inline-flex items-center justify-center w-24 h-24 mb-3">
                      <svg className="w-24 h-24 -rotate-90" viewBox="0 0 96 96">
                        <circle cx="48" cy="48" r="40" fill="none" stroke="currentColor" strokeWidth="8" className="text-gray-100 dark:text-gray-700" />
                        <circle
                          cx="48" cy="48" r="40" fill="none" strokeWidth="8"
                          stroke={percent === 100 ? "#10b981" : "#3b82f6"}
                          strokeDasharray={`${2 * Math.PI * 40}`}
                          strokeDashoffset={`${2 * Math.PI * 40 * (1 - percent / 100)}`}
                          strokeLinecap="round"
                          className="transition-all duration-700"
                        />
                      </svg>
                      <span className="absolute text-xl font-bold text-gray-900 dark:text-white">{percent}%</span>
                    </div>
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">
                      {completedVideos}/{totalVideos} videos completed
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      {percent === 100 ? "Course completed!" : "Keep going!"}
                    </p>
                  </div>
                )}

                {/* Instructor */}
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center text-blue-600 dark:text-blue-400 font-bold shrink-0">
                    {course.teacher?.name?.[0]?.toUpperCase() || "I"}
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 font-medium uppercase tracking-wider">Instructor</p>
                    <p className="font-semibold text-gray-900 dark:text-white text-sm line-clamp-1">
                      {course.teacher?.name || "Unknown"}
                    </p>
                  </div>
                </div>

                {/* Meta */}
                <div className="space-y-3 text-sm border-t border-gray-100 dark:border-gray-800 pt-4">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-500 dark:text-gray-400">Language</span>
                    <span className="font-medium text-gray-900 dark:text-white bg-gray-100 dark:bg-gray-800 px-2.5 py-1 rounded-md">
                      {course.language || "English"}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-500 dark:text-gray-400">Certificate</span>
                    <span className="font-medium text-gray-900 dark:text-white bg-gray-100 dark:bg-gray-800 px-2.5 py-1 rounded-md">
                      {course.has_certificate ? "Yes" : "No"}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-500 dark:text-gray-400">Sections</span>
                    <span className="font-medium text-gray-900 dark:text-white bg-gray-100 dark:bg-gray-800 px-2.5 py-1 rounded-md">
                      {sections.length}
                    </span>
                  </div>
                </div>

                {/* Completion note */}
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-xl p-3 text-xs text-blue-700 dark:text-blue-300 space-y-1">
                  <p className="font-semibold flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5" /> Completion requires
                  </p>
                  <ul className="space-y-0.5 pl-5 list-disc">
                    <li>All video quizzes answered</li>
                    <li>All assessment questions answered</li>
                  </ul>
                </div>

                {course.has_certificate && (
                  <div className="border-t border-gray-100 dark:border-gray-800 pt-4 text-center">
                    <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 mb-2">
                      <Trophy className="w-5 h-5" />
                    </div>
                    <p className="font-medium text-gray-900 dark:text-white text-sm">Certificate of Completion</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      Complete all videos to earn your certificate.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  )
}
