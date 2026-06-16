"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { ProtectedRoute } from "@/components/auth/ProtectedRoute"
import { classesApi, type CourseClass } from "@/lib/api/classes"
import { PlayCircle, CheckCircle2, LayoutList, Trophy, ArrowLeft } from "lucide-react"
import { getImageUrl } from "@/lib/class-utils"

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
        <div className="p-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Loading course...</h1>
        </div>
      </ProtectedRoute>
    )
  }

  if (!course) {
    return (
      <ProtectedRoute>
        <div className="p-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Course not found</h1>
          <p className="text-gray-600 dark:text-gray-400 mb-6">We could not find the course you are looking for.</p>
          <Link href="/my-course" className="text-blue-600 dark:text-blue-400 hover:underline">Back to My Courses</Link>
        </div>
      </ProtectedRoute>
    )
  }

  return (
    <ProtectedRoute>
      <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        {/* Header */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Link href="/my-course">
              <Button variant="ghost" size="sm" className="h-8 gap-1 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white mr-2">
                <ArrowLeft className="w-4 h-4" />
                Back to Dashboard
              </Button>
            </Link>
            <span className="text-sm font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-2.5 py-0.5 rounded-full">
              {course.category?.name || "General"}
            </span>
            <Badge variant="secondary" className="bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700">
              {course.level || "Beginner"}
            </Badge>
          </div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 dark:text-white mb-3 tracking-tight">
            {course.name}
          </h1>
          <p className="text-gray-600 dark:text-gray-400 max-w-3xl">
            {course.short_description || "Welcome to the course. Select a video from the curriculum below to start learning and answering quizzes."}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 xl:grid-cols-4 gap-8">
          {/* Main Content - Left (Playlist Only) */}
          <div className="lg:col-span-2 xl:col-span-3 space-y-8">
            <div className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 rounded-2xl p-6 sm:p-8 shadow-sm border">
              <div className="flex items-center gap-2 mb-6 border-b border-gray-100 dark:border-gray-800 pb-4">
                <LayoutList className="w-5 h-5 text-gray-500" />
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">Course Curriculum</h3>
              </div>
              
              <div className="space-y-8">
                {course.sections && course.sections.length > 0 ? (
                  course.sections.map((section: any, idx: number) => (
                    <div key={section.id} className="space-y-4">
                      <h4 className="font-semibold text-gray-900 dark:text-white flex items-center gap-4 text-lg bg-gray-50 dark:bg-gray-800/50 p-5 rounded-xl border border-gray-100 dark:border-gray-800">
                        <span className="flex items-center justify-center bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 w-10 h-10 rounded-lg text-base shrink-0 shadow-sm">
                          {idx + 1}
                        </span>
                        {section.title}
                      </h4>
                      <div className="space-y-3 pl-2 sm:pl-4">
                        {section.videos && section.videos.length > 0 ? (
                          section.videos.map((video: any, vIdx: number) => (
                            <Link href={`/my-course/${params.id}/video/${video.id}`} key={video.id} className="block group">
                              <div className="flex flex-col sm:flex-row gap-5 p-5 sm:p-6 rounded-xl cursor-pointer transition-all duration-200 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 hover:border-blue-200 dark:hover:border-blue-800 hover:shadow-md hover:ring-1 hover:ring-blue-100 dark:hover:ring-blue-900">
                                <div className="w-full sm:w-48 aspect-video bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden shrink-0 relative shadow-sm">
                                  {video.thumbnail_path ? (
                                    <img src={getImageUrl(video.thumbnail_path) || undefined} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                                  ) : (
                                    <div className="w-full h-full flex items-center justify-center">
                                      <PlayCircle className="w-8 h-8 text-gray-300 dark:text-gray-600" />
                                    </div>
                                  )}
                                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                                    <PlayCircle className="w-10 h-10 text-white opacity-0 group-hover:opacity-100 transition-transform duration-300 transform scale-75 group-hover:scale-100 drop-shadow-lg" />
                                  </div>
                                </div>
                                
                                <div className="flex-1 min-w-0 flex flex-col justify-center py-1">
                                  <h5 className="font-semibold text-lg sm:text-xl line-clamp-2 leading-snug mb-2 text-gray-900 dark:text-gray-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                                    {vIdx + 1}. {video.title}
                                  </h5>
                                  <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2 mb-3">
                                    {video.description || "No description provided."}
                                  </p>
                                  <div className="flex items-center gap-3 text-xs font-medium text-blue-600 dark:text-blue-400 mt-auto">
                                    <span className="flex items-center gap-2 bg-blue-50 dark:bg-blue-900/30 px-3.5 py-1.5 rounded-md text-sm">
                                      <PlayCircle className="w-4 h-4" /> 
                                      Watch Video & Take Quiz
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </Link>
                          ))
                        ) : (
                          <p className="text-sm text-gray-500 italic pl-11 py-2">No videos in this section yet.</p>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-8">
                    Course curriculum is being prepared.
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Sidebar - Right */}
          <div className="lg:col-span-1 space-y-6">
            <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 shadow-sm sticky top-6">
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-6 pb-6 border-b border-gray-100 dark:border-gray-800">
                  <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center text-blue-600 dark:text-blue-400 font-bold text-lg shrink-0">
                    {course.teacher?.name?.[0]?.toUpperCase() || "I"}
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 font-medium uppercase tracking-wider mb-0.5">Instructor</p>
                    <p className="font-semibold text-gray-900 dark:text-white line-clamp-1">{course.teacher?.name || "Unknown Instructor"}</p>
                  </div>
                </div>
                
                <div className="space-y-4 text-sm mb-8">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-500 dark:text-gray-400">Language</span>
                    <span className="font-medium text-gray-900 dark:text-white bg-gray-100 dark:bg-gray-800 px-2.5 py-1 rounded-md">{course.language || "English"}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-500 dark:text-gray-400">Certificate</span>
                    <span className="font-medium text-gray-900 dark:text-white bg-gray-100 dark:bg-gray-800 px-2.5 py-1 rounded-md">{course.has_certificate ? "Yes" : "No"}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-500 dark:text-gray-400">Total Sections</span>
                    <span className="font-medium text-gray-900 dark:text-white bg-gray-100 dark:bg-gray-800 px-2.5 py-1 rounded-md">{course.sections?.length || 0}</span>
                  </div>
                </div>

                <div className="flex flex-col gap-3">
                  <Button className="w-full bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm" size="lg">
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    Mark Course as Completed
                  </Button>
                </div>
                
                {course.has_certificate && (
                  <div className="mt-6 pt-6 border-t border-gray-100 dark:border-gray-800 text-center">
                    <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 mb-3">
                      <Trophy className="w-5 h-5" />
                    </div>
                    <h4 className="font-medium text-gray-900 dark:text-white text-sm mb-1">Certificate of Completion</h4>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Complete all quizzes to earn your certificate.</p>
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
