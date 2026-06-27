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
import { format } from "date-fns"
import { useAuth } from "@/contexts/AuthContext"
import { CertificateDialog } from "@/components/certificate/CertificateDialog"
import { buildCertificateId, countLectures } from "@/components/certificate/certificate-utils"

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
    <div className="flex flex-wrap gap-2 mt-3">
      {hasQuiz && (
        <span className={cn(
          "inline-flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded border",
          video.is_quiz_done
            ? "bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-950/50 dark:border-emerald-800 dark:text-emerald-400"
            : "bg-gray-50 border-gray-200 text-gray-600 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-400"
        )}>
          <HelpCircle className="w-3.5 h-3.5" />
          Quiz {video.quiz_done_count}/{video.quiz_count}
        </span>
      )}
      {hasAssessment && (
        <span className={cn(
          "inline-flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded border",
          video.is_assessment_done
            ? "bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-950/50 dark:border-emerald-800 dark:text-emerald-400"
            : "bg-gray-50 border-gray-200 text-gray-600 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-400"
        )}>
          <FileText className="w-3.5 h-3.5" />
          Assessment {video.assessment_done_count}/{video.assessment_count}
        </span>
      )}
    </div>
  )
}

export default function CourseMaterialPage({ params }: { params: { id: string } }) {
  const { user } = useAuth()
  const [course, setCourse] = useState<CourseClass | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isCertOpen, setIsCertOpen] = useState(false)

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
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
          <p className="text-sm text-gray-500">Memuat materi kursus...</p>
        </div>
      </ProtectedRoute>
    )
  }

  if (!course) {
    return (
      <ProtectedRoute>
        <div className="flex flex-col items-center justify-center min-h-[60vh] p-6 text-center">
          <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4">
            <BookOpen className="w-8 h-8 text-gray-400 dark:text-gray-500" />
          </div>
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Kursus Tidak Ditemukan</h1>
          <p className="text-gray-500 dark:text-gray-400 mb-6 max-w-md">
            Materi kursus yang Anda cari tidak tersedia atau telah dihapus.
          </p>
          <Link href="/my-course">
            <Button variant="default" className="gap-2">
              <ArrowLeft className="w-4 h-4" /> Kembali ke Kursus Saya
            </Button>
          </Link>
        </div>
      </ProtectedRoute>
    )
  }

  const sections = course.sections || []
  const { totalVideos, completedVideos, percent } = computeCourseProgress(sections)
  const certificateUnlocked = !!course.has_certificate && totalVideos > 0 && percent === 100

  return (
    <ProtectedRoute>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">

        {/* Header Section */}
        <div className="flex flex-col gap-4 border-b border-gray-200 dark:border-gray-800 pb-8">
          <div className="flex items-center gap-3">
            <Link href="/my-course">
              <Button variant="outline" size="sm" className="h-8 gap-2">
                <ArrowLeft className="w-3.5 h-3.5" /> Kembali
              </Button>
            </Link>
            <div className="h-4 w-px bg-gray-300 dark:bg-gray-700" />
            <Badge variant="secondary" className="font-normal text-white">
              {course.category?.name || "General"}
            </Badge>
            {course.level && (
              <Badge variant="outline" className="font-normal text-gray-600 dark:text-gray-400">
                {course.level}
              </Badge>
            )}
          </div>
          <div className="space-y-2 max-w-4xl">
            <h1 className="text-2xl sm:text-4xl font-bold text-gray-900 dark:text-white tracking-tight">
              {course.name}
            </h1>
            <p className="text-base text-gray-600 dark:text-gray-400 leading-relaxed">
              {course.short_description || "Pilih video dari kurikulum di bawah ini untuk mulai belajar."}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 xl:grid-cols-4 gap-8">

          {/* Main Content Area */}
          <div className="lg:col-span-2 xl:col-span-3 space-y-8">

            {/* What You'll Learn */}
            {(course.what_you_will_learn ?? []).filter(Boolean).length > 0 && (
              <div className="bg-gray-50/50 dark:bg-gray-900/20 border border-gray-200 dark:border-gray-800 rounded-xl p-6 sm:p-8">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
                  <GraduationCap className="w-5 h-5 text-gray-500" />
                  Yang Akan Anda Pelajari
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {(course.what_you_will_learn ?? []).filter(Boolean).map((item, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <CheckCircle2 className="w-5 h-5 text-gray-400 shrink-0 mt-0.5" />
                      <span className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Curriculum Sections */}
            <div>
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <LayoutList className="w-5 h-5 text-gray-400" />
                  Kurikulum Kursus
                </h3>
                <span className="text-sm font-medium text-gray-500">
                  {sections.length} Bagian • {totalVideos} Video
                </span>
              </div>

              <div className="space-y-6">
                {sections.length > 0 ? (
                  sections.map((section: any, idx: number) => {
                    const sectionVideos: VideoWithCompletion[] = section.videos || []
                    const sectionTotal = sectionVideos.length
                    const sectionDone = sectionVideos.filter((v) => v.is_completed).length

                    return (
                      <div key={section.id} className="border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden bg-white dark:bg-gray-900">
                        {/* Section Header */}
                        <div className="bg-gray-50 dark:bg-gray-900/50 p-4 sm:px-6 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <span className="text-lg font-medium text-gray-400 dark:text-gray-500">
                              {String(idx + 1).padStart(2, '0')}
                            </span>
                            <h4 className="font-semibold text-gray-900 dark:text-white">
                              {section.title}
                            </h4>
                          </div>
                          <span className="text-sm text-gray-500 dark:text-gray-400 bg-gray-200/50 dark:bg-gray-800 px-2.5 py-1 rounded-md">
                            {sectionDone}/{sectionTotal} Selesai
                          </span>
                        </div>

                        {/* Video List */}
                        <div className="divide-y divide-gray-100 dark:divide-gray-800/60">
                          {sectionVideos.length > 0 ? (
                            sectionVideos.map((video, vIdx) => (
                              <Link href={`/my-course/${params.id}/video/${video.id}`} key={video.id} className="block group">
                                <div className={cn(
                                  "flex flex-col sm:flex-row gap-4 p-4 sm:p-6 transition-colors duration-200 relative",
                                  video.is_completed
                                    ? "bg-slate-50/50 dark:bg-slate-900/20"
                                    : "hover:bg-gray-50 dark:hover:bg-gray-800/50"
                                )}>

                                  {/* Left Border Status for Desktop */}
                                  {video.is_completed && (
                                    <div className="hidden sm:block absolute left-0 top-0 bottom-0 w-1 bg-emerald-500" />
                                  )}

                                  {/* Thumbnail */}
                                  <div className="relative w-full sm:w-48 aspect-video bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden shrink-0 border border-gray-200/50 dark:border-gray-700/50">
                                    {video.thumbnail_path ? (
                                      <img
                                        src={getImageUrl(video.thumbnail_path) || undefined}
                                        alt={video.title}
                                        className="w-full h-full object-cover"
                                      />
                                    ) : (
                                      <div className="w-full h-full flex items-center justify-center">
                                        <PlayCircle className="w-8 h-8 text-gray-300 dark:text-gray-600" />
                                      </div>
                                    )}
                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
                                      <PlayCircle className="w-10 h-10 text-white" />
                                    </div>
                                    {video.is_completed && (
                                      <div className="absolute top-2 right-2 sm:hidden w-6 h-6 bg-emerald-500 rounded-full flex items-center justify-center">
                                        <CheckCircle2 className="w-4 h-4 text-white" />
                                      </div>
                                    )}
                                  </div>

                                  {/* Content */}
                                  <div className="flex-1 min-w-0 py-1">
                                    <div className="flex items-start justify-between gap-4">
                                      <div>
                                        <h5 className="font-medium text-base text-gray-900 dark:text-gray-100 mb-1.5 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors line-clamp-2">
                                          {vIdx + 1}. {video.title}
                                        </h5>
                                        <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2 leading-relaxed">
                                          {video.description || "Tidak ada deskripsi."}
                                        </p>
                                      </div>
                                      {video.is_completed && (
                                        <CheckCircle2 className="hidden sm:block w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                                      )}
                                    </div>
                                    <VideoCompletionBadges video={video} />
                                  </div>
                                </div>
                              </Link>
                            ))
                          ) : (
                            <div className="p-6 text-center text-sm text-gray-500">
                              Belum ada materi di bagian ini.
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })
                ) : (
                  <div className="border border-dashed border-gray-300 dark:border-gray-700 rounded-xl p-12 text-center">
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Kurikulum kursus sedang disiapkan.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Sidebar Area */}
          <div className="lg:col-span-1">
            <div className="sticky top-6 space-y-6">
              <Card className="shadow-none border-gray-200 dark:border-gray-800">
                <CardContent className="p-6">

                  {/* Progress Section */}
                  {totalVideos > 0 && (
                    <div className="mb-8">
                      <div className="flex items-center justify-between mb-3">
                        <span className="font-medium text-gray-900 dark:text-white">Progres Belajar</span>
                        <span className="text-sm font-semibold text-blue-600 dark:text-blue-400">{percent}%</span>
                      </div>
                      <Progress value={percent} className="h-2 mb-3 bg-gray-100 dark:bg-gray-800" />
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {completedVideos} dari {totalVideos} video diselesaikan
                      </p>
                    </div>
                  )}

                  {/* Instructor Info */}
                  <div className="flex items-center gap-4 mb-6 pb-6 border-b border-gray-100 dark:border-gray-800">
                    <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-600 dark:text-gray-300 font-semibold text-lg">
                      {course.teacher?.name?.[0]?.toUpperCase() || "I"}
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">Instruktur</p>
                      <p className="font-medium text-gray-900 dark:text-white text-sm">
                        {course.teacher?.name || "Tidak diketahui"}
                      </p>
                    </div>
                  </div>

                  {/* Meta Info */}
                  <div className="space-y-4 text-sm mb-6">
                    <div className="flex justify-between items-center text-gray-600 dark:text-gray-400">
                      <span>Bahasa</span>
                      <span className="font-medium text-gray-900 dark:text-gray-200">
                        {course.language || "English"}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-gray-600 dark:text-gray-400">
                      <span>Sertifikat</span>
                      <span className="font-medium text-gray-900 dark:text-gray-200">
                        {course.has_certificate ? "Tersedia" : "Tidak ada"}
                      </span>
                    </div>
                  </div>

                  {/* Requirements Note */}
                  <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4 text-sm text-gray-600 dark:text-gray-400 mb-6 border border-gray-100 dark:border-gray-800">
                    <p className="font-medium text-gray-900 dark:text-gray-200 flex items-center gap-2 mb-2">
                      <Lock className="w-4 h-4 text-gray-400" /> Syarat Kelulusan
                    </p>
                    <ul className="list-disc pl-5 space-y-1 text-xs">
                      <li>Menonton semua video</li>
                      <li>Mengerjakan kuis materi</li>
                      <li>Menyelesaikan assessment</li>
                    </ul>
                  </div>

                  {/* Certificate Action */}
                  {course.has_certificate && (
                    <div>
                      {certificateUnlocked ? (
                        <div className="text-center p-4 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/50 rounded-lg">
                          <Trophy className="w-6 h-6 text-emerald-600 dark:text-emerald-500 mx-auto mb-2" />
                          <p className="font-medium text-emerald-800 dark:text-emerald-400 text-sm mb-3">
                            Sertifikat Tersedia!
                          </p>
                          <Button
                            onClick={() => setIsCertOpen(true)}
                            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
                          >
                            Lihat Sertifikat
                          </Button>
                        </div>
                      ) : (
                        <Button
                          disabled
                          variant="outline"
                          className="w-full justify-start text-gray-400 border-gray-200 dark:border-gray-800"
                        >
                          <Lock className="w-4 h-4 mr-2" />
                          Sertifikat Terkunci
                        </Button>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>

        {certificateUnlocked && (
          <CertificateDialog
            open={isCertOpen}
            onOpenChange={setIsCertOpen}
            data={{
              studentName: user?.name || "Student",
              courseName: course.name,
              instructorName: course.teacher?.name || "Course Instructor",
              dateText: format(new Date(), "dd MMMM yyyy"),
              certificateId: buildCertificateId(course.id, user?.id || ""),
              lectureCount: countLectures(course),
            }}
          />
        )}
      </div>
    </ProtectedRoute>
  )
}