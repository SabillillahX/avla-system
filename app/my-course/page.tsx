"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { ProtectedRoute } from "@/components/auth/ProtectedRoute"
import { useAuth } from "@/contexts/AuthContext"
import { type CourseClass } from "@/lib/api/classes"
import { Search, PlayCircle, BookOpen, Clock, Trophy } from "lucide-react"
import { getImageUrl } from "@/lib/class-utils"

type FilterMode = "all" | "in-progress" | "completed"
const backendBaseUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000/api"

const extractCourseArray = (value: unknown): CourseClass[] => {
  if (Array.isArray(value)) {
    return value as CourseClass[]
  }

  if (value && typeof value === "object" && "data" in value && Array.isArray((value as { data?: unknown }).data)) {
    return (value as { data: CourseClass[] }).data
  }

  return []
}

export default function MyCoursePage() {
  const { user, isLoading } = useAuth()
  const [searchQuery, setSearchQuery] = useState("")
  const [filterMode, setFilterMode] = useState<FilterMode>("all")
  const [enrolledClasses, setEnrolledClasses] = useState<CourseClass[]>([])
  const [isFetching, setIsFetching] = useState(true)

  useEffect(() => {
    const loadEnrolled = async () => {
      if (isLoading) return

      if (!user?.roles?.includes("student")) {
        setEnrolledClasses([])
        setIsFetching(false)
        return
      }

      try {
        const token = typeof window !== "undefined" ? localStorage.getItem("auth_token") : null
        const response = await fetch(`${backendBaseUrl}/classes/enrolled`, {
          headers: {
            Accept: "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        })

        if (!response.ok) {
          throw new Error(`Failed to load enrolled classes: ${response.status}`)
        }

        const payload = await response.json()
        setEnrolledClasses(extractCourseArray(payload?.data))
      } catch (err) {
        console.error('Failed to load enrolled classes', err)
        setEnrolledClasses([])
      } finally {
        setIsFetching(false)
      }
    }

    loadEnrolled()
  }, [isLoading, user?.id, user?.roles])

  const enrolledCourses = useMemo(() => {
    return (enrolledClasses ?? []).map((course) => {
      let totalVideos = 0
      let completedVideos = 0
      let lastLessonStr = "Not started yet"

      if (course.sections && Array.isArray(course.sections)) {
        course.sections.forEach((section: any) => {
          if (section.videos && Array.isArray(section.videos)) {
            totalVideos += section.videos.length
            section.videos.forEach((video: any) => {
              // A video is done only when ALL its quizzes AND assessments are answered
              const isDone = video.is_completed === true
              if (isDone) {
                completedVideos++
                lastLessonStr = video.title
              }
            })
          }
        })

        if (completedVideos === 0 && course.sections[0]?.videos?.[0]) {
          lastLessonStr = "Up next: " + course.sections[0].videos[0].title
        }
      }

      const progressPercent = totalVideos > 0 ? Math.round((completedVideos / totalVideos) * 100) : 0

      return {
        ...course,
        progress: progressPercent,
        totalLessons: totalVideos,
        completedLessons: completedVideos,
        lastLesson: lastLessonStr,
        status: progressPercent === 100 && totalVideos > 0 ? "completed" as const : "in-progress" as const,
      }
    })
  }, [enrolledClasses])

  const filteredCourses = useMemo(() => {
    return enrolledCourses.filter((course) => {
      const matchesSearch =
      course.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (course.teacher?.name || "").toLowerCase().includes(searchQuery.toLowerCase())
      const matchesFilter = filterMode === "all" || course.status === filterMode
      return matchesSearch && matchesFilter
    })
  }, [enrolledCourses, filterMode, searchQuery])

  return (
    <ProtectedRoute>
      <div className="max-w-[1600px] mx-auto p-6 sm:p-8 lg:p-10 space-y-8">
        
        {/* Modern Header Section */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-gray-100 dark:border-gray-800">
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-2 tracking-tight">My Learning</h1>
            <p className="text-base text-gray-500 dark:text-gray-400">Continue watching and complete your assessments.</p>
          </div>
          
          <div className="flex items-center gap-3 bg-gray-50 dark:bg-gray-800/50 p-1.5 rounded-lg border border-gray-100 dark:border-gray-700">
            <Button
              variant={filterMode === "all" ? "default" : "ghost"}
              onClick={() => setFilterMode("all")}
              className={`h-9 px-4 rounded-md transition-all ${filterMode === 'all' ? 'shadow-sm' : 'text-gray-600 dark:text-gray-400'}`}
            >
              All Courses
            </Button>
            <Button
              variant={filterMode === "in-progress" ? "default" : "ghost"}
              onClick={() => setFilterMode("in-progress")}
              className={`h-9 px-4 rounded-md transition-all ${filterMode === 'in-progress' ? 'shadow-sm' : 'text-gray-600 dark:text-gray-400'}`}
            >
              In Progress
            </Button>
            <Button
              variant={filterMode === "completed" ? "default" : "ghost"}
              onClick={() => setFilterMode("completed")}
              className={`h-9 px-4 rounded-md transition-all ${filterMode === 'completed' ? 'shadow-sm' : 'text-gray-600 dark:text-gray-400'}`}
            >
              Completed
            </Button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="max-w-md">
          <div className="relative group">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5 group-focus-within:text-blue-500 transition-colors" />
            <Input
              placeholder="Search by course name or instructor..."
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              className="pl-11 h-12 bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 rounded-xl shadow-sm focus-visible:ring-blue-500 text-base"
            />
          </div>
        </div>

        {/* Loading State */}
        {isFetching && (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {[1, 2, 3].map(i => (
              <div key={i} className="animate-pulse bg-gray-100 dark:bg-gray-800 rounded-2xl h-[380px] w-full" />
            ))}
          </div>
        )}

        {/* Empty State */}
        {!isFetching && filteredCourses.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 px-4 text-center bg-gray-50 dark:bg-gray-800/30 rounded-3xl border border-dashed border-gray-200 dark:border-gray-700">
            <BookOpen className="w-16 h-16 text-gray-300 dark:text-gray-600 mb-4" />
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">No courses found</h3>
            <p className="text-gray-500 dark:text-gray-400 max-w-sm mb-6">
              {searchQuery ? "We couldn't find any courses matching your search." : "You haven't enrolled in any courses yet."}
            </p>
            {!searchQuery && (
              <Link href="/courses">
                <Button size="lg" className="rounded-full px-8 shadow-md hover:shadow-lg transition-all">Browse Courses</Button>
              </Link>
            )}
          </div>
        )}

        {/* Course Grid */}
        {!isFetching && filteredCourses.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
            {filteredCourses.map((course) => (
              <Card key={course.id} className="group overflow-hidden bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:shadow-xl hover:border-blue-200 dark:hover:border-blue-900/50 transition-all duration-300 rounded-2xl flex flex-col h-full cursor-pointer">
                <Link href={`/my-course/${course.id}`} className="flex flex-col h-full">
                  
                  {/* Thumbnail Container */}
                  <div className="relative aspect-video overflow-hidden bg-gray-100 dark:bg-gray-900">
                    <img
                      src={
                        getImageUrl(course.thumbnail_url) ||
                        "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?q=80&w=1200&auto=format&fit=crop"
                      }
                      alt={course.name}
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                    />
                    
                    {/* Overlay Gradient & Play Button */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-80 transition-opacity duration-300" />
                    
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 transform scale-75 group-hover:scale-100">
                      <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center border border-white/40 shadow-2xl">
                        <PlayCircle className="w-8 h-8 text-white ml-1" />
                      </div>
                    </div>

                    {/* Top Badges */}
                    <div className="absolute top-4 left-4 right-4 flex justify-between items-start">
                      <Badge className="bg-black/50 backdrop-blur-md text-white border-none hover:bg-black/60 shadow-sm">
                        {course.category?.name || "General"}
                      </Badge>
                      {course.status === "completed" && (
                        <div className="bg-emerald-500 text-white w-8 h-8 rounded-full flex items-center justify-center shadow-md">
                          <Trophy className="w-4 h-4" />
                        </div>
                      )}
                    </div>

                    {/* Bottom Progress Bar embedded in image */}
                    <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-gray-200/20 backdrop-blur-sm">
                      <div 
                        className={`h-full transition-all duration-1000 ${course.status === 'completed' ? 'bg-emerald-500' : 'bg-blue-600'}`} 
                        style={{ width: `${course.progress}%` }}
                      />
                    </div>
                  </div>

                  {/* Card Content */}
                  <CardContent className="p-8 flex flex-col flex-1">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center text-blue-700 dark:text-blue-400 font-bold text-xs">
                          {course.teacher?.name?.[0]?.toUpperCase() || "I"}
                        </div>
                        <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{course.teacher?.name || "Instructor"}</p>
                      </div>
                      
                      <h3 className="text-xl font-bold text-gray-900 dark:text-white line-clamp-2 mb-4 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                        {course.name}
                      </h3>
                    </div>

                    <div className="mt-auto space-y-4 pt-4 border-t border-gray-100 dark:border-gray-800">
                      
                      <div className="flex items-end justify-between">
                        <div>
                          <p className="text-sm font-semibold text-gray-900 dark:text-white mb-1">
                            {course.progress}% Completed
                          </p>
                          <p className="text-xs text-gray-500 flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5" />
                            {course.completedLessons} / {course.totalLessons} Quizzes Done
                          </p>
                        </div>
                        <Button 
                          variant={course.status === "completed" ? "outline" : "default"} 
                          className={`rounded-full px-5 ${course.status === 'completed' ? '' : 'bg-blue-600 hover:bg-blue-700 text-white shadow-md hover:shadow-lg'}`}
                        >
                          {course.status === "completed" ? "Review" : "Continue"}
                        </Button>
                      </div>

                    </div>
                  </CardContent>
                </Link>
              </Card>
            ))}
          </div>
        )}
      </div>
    </ProtectedRoute>
  )
}
