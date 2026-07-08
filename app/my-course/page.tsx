"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { ProtectedRoute } from "@/components/auth/ProtectedRoute"
import { useAuth } from "@/contexts/AuthContext"
import { type CourseClass, type CourseBatchInfo } from "@/lib/api/classes"
import { Search, PlayCircle, BookOpen, Clock, Trophy, CalendarDays, AlertCircle } from "lucide-react"
import { getImageUrl, computeCourseProgress } from "@/lib/class-utils"

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

const formatBatchDateTime = (dateStr: string, timeStr?: string | null) => {
  if (!dateStr) return "";
  const dateObj = new Date(dateStr);
  let formatted = dateObj.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  if (timeStr) {
    const [hours, minutes] = timeStr.split(':');
    const d = new Date();
    d.setHours(parseInt(hours, 10), parseInt(minutes, 10));
    formatted += " " + d.toLocaleTimeString("en-US", { hour: 'numeric', minute: '2-digit' });
  } else if (dateStr.includes('T') && !dateStr.endsWith('T00:00:00.000Z')) {
    formatted += " " + dateObj.toLocaleTimeString("en-US", { hour: 'numeric', minute: '2-digit' });
  }
  return formatted;
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
        const response = await fetch(`${backendBaseUrl}/courses/enrolled`, {
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
      let lastLessonStr = "Not started yet"
      const sections = course.sections || []
      const { totalVideos, completedVideos, percent } = computeCourseProgress(sections)

      // Find last completed lesson name
      if (completedVideos > 0) {
        for (const section of sections) {
          for (const video of section.videos || []) {
            if (video.is_completed) {
              lastLessonStr = video.title
            }
          }
        }
      } else if (sections[0]?.videos?.[0]) {
        lastLessonStr = "Up next: " + sections[0].videos[0].title
      }

      const progressPercent = percent

      // Determine batch status for this enrolled course
      const allBatches: CourseBatchInfo[] = course.batches || []
      const activeBatch = allBatches.find((b) => b.status === "active") || course.active_batch || null
      const hasExpiredBatches = allBatches.some((b) => b.status === "expired" || b.status === "closed")
      const hasActiveBatch = !!activeBatch
      const isBatchExpired = !hasActiveBatch && hasExpiredBatches
      const relevantBatch = activeBatch || allBatches.find((b) => b.status === "expired" || b.status === "closed") || null

      return {
        ...course,
        progress: progressPercent,
        totalLessons: totalVideos,
        completedLessons: completedVideos,
        lastLesson: lastLessonStr,
        status: progressPercent === 100 && totalVideos > 0 ? "completed" as const : "in-progress" as const,
        activeBatch,
        isBatchExpired,
        relevantBatch,
        batchEndDate: relevantBatch?.end_date || null,
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="animate-pulse bg-gray-100 dark:bg-gray-800 rounded-xl h-[320px] w-full" />
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredCourses.map((course) => (
              <Card key={course.id} className={`group overflow-hidden bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:shadow-lg hover:border-blue-200 dark:hover:border-blue-900/50 transition-all duration-300 rounded-xl flex flex-col h-full cursor-pointer ${course.isBatchExpired ? 'opacity-75' : ''}`}>
                <Link href={`/my-course/${course.id}`} className="flex flex-col h-full">
                  
                  {/* Thumbnail Container */}
                  <div className="relative aspect-[16/10] overflow-hidden bg-gray-100 dark:bg-gray-900">
                    <img
                      src={
                        getImageUrl(course.thumbnail_url) ||
                        "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?q=80&w=1200&auto=format&fit=crop"
                      }
                      alt={course.name}
                      className={`w-full h-full object-cover transition-transform duration-700 group-hover:scale-105 ${course.isBatchExpired ? 'grayscale-[30%]' : ''}`}
                    />
                    
                    {/* Overlay Gradient & Play Button */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-80 transition-opacity duration-300" />
                    
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 transform scale-90 group-hover:scale-100">
                      <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center border border-white/40 shadow-lg">
                        <PlayCircle className="w-6 h-6 text-white ml-0.5" />
                      </div>
                    </div>

                    {/* Top Badges */}
                    <div className="absolute top-3 left-3 right-3 flex justify-between items-start">
                      <div className="flex items-center gap-1.5">
                        <Badge className="bg-black/50 backdrop-blur-md text-white border-none text-[10px] px-2 py-0 hover:bg-black/60 shadow-sm font-medium">
                          {course.category?.name || "General"}
                        </Badge>
                        {course.isBatchExpired && (
                          <Badge className="bg-rose-500/90 backdrop-blur-md text-white border-none text-[10px] px-2 py-0 hover:bg-rose-600 shadow-sm font-medium">
                            Batch Ended
                          </Badge>
                        )}
                      </div>
                      {course.status === "completed" && (
                        <div className="bg-emerald-500 text-white w-6 h-6 rounded-full flex items-center justify-center shadow-sm">
                          <Trophy className="w-3 h-3" />
                        </div>
                      )}
                    </div>

                    {/* Bottom Progress Bar embedded in image */}
                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-200/20 backdrop-blur-sm">
                      <div 
                        className={`h-full transition-all duration-1000 ${course.status === 'completed' ? 'bg-emerald-500' : course.isBatchExpired ? 'bg-rose-500' : 'bg-blue-600'}`} 
                        style={{ width: `${course.progress}%` }}
                      />
                    </div>
                  </div>

                  {/* Card Content */}
                  <CardContent className="p-5 flex flex-col flex-1">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2.5">
                        <div className="w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center text-blue-700 dark:text-blue-400 font-bold text-[10px]">
                          {course.teacher?.name?.[0]?.toUpperCase() || "I"}
                        </div>
                        <p className="text-[11px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{course.teacher?.name || "Instructor"}</p>
                      </div>
                      
                      <h3 className="text-base font-bold text-gray-900 dark:text-white line-clamp-2 mb-3 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors leading-snug">
                        {course.name}
                      </h3>
                    </div>

                    <div className="mt-auto space-y-3 pt-3 border-t border-gray-100 dark:border-gray-800">
                      
                      {/* Batch schedule info */}
                      {course.relevantBatch && (
                        <div className={`flex items-start gap-1.5 text-[10px] sm:text-[11px] px-2.5 py-1.5 rounded-md ${
                          course.isBatchExpired 
                            ? 'bg-rose-50 text-rose-700 dark:bg-rose-900/20 dark:text-rose-400' 
                            : 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400'
                        }`}>
                          {course.isBatchExpired ? (
                            <AlertCircle className="w-3 h-3 shrink-0 mt-0.5" />
                          ) : (
                            <CalendarDays className="w-3 h-3 shrink-0 mt-0.5" />
                          )}
                          <span className="leading-tight">
                            {formatBatchDateTime(course.relevantBatch.start_date, course.relevantBatch.start_time)}<br/>
                            <span className="opacity-75">to</span> {formatBatchDateTime(course.relevantBatch.end_date, course.relevantBatch.end_time)}
                          </span>
                        </div>
                      )}

                      <div className="flex items-end justify-between">
                        <div>
                          <p className="text-sm font-semibold text-gray-900 dark:text-white mb-0.5">
                            {course.progress}%
                          </p>
                          <p className="text-[11px] text-gray-500 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {course.completedLessons}/{course.totalLessons} Done
                          </p>
                        </div>
                        <Button 
                          size="sm"
                          variant={course.status === "completed" ? "outline" : course.isBatchExpired ? "outline" : "default"} 
                          className={`rounded-lg px-4 h-8 text-xs ${
                            course.isBatchExpired 
                              ? 'border-rose-200 text-rose-600 hover:bg-rose-50 dark:border-rose-800 dark:text-rose-400' 
                              : course.status === 'completed' 
                                ? '' 
                                : 'bg-blue-600 hover:bg-blue-700 text-white shadow hover:shadow-md'
                          }`}
                        >
                          {course.isBatchExpired ? "Ended" : course.status === "completed" ? "Review" : "Continue"}
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
