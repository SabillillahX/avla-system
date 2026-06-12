"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { ProtectedRoute } from "@/components/auth/ProtectedRoute"
import { useAuth } from "@/contexts/AuthContext"
import { type CourseClass } from "@/lib/api/classes"
import { Search, PlayCircle } from "lucide-react"
import { getImageUrl } from "@/lib/class-utils"

interface CourseProgress {
  progress: number
  totalLessons: number
  completedLessons: number
  lastLesson: string
  status: "in-progress" | "completed"
}

const progressByCourseId: Record<string, CourseProgress> = {
  "trend-1": {
    progress: 62,
    totalLessons: 48,
    completedLessons: 30,
    lastLesson: "Building MCP Tools",
    status: "in-progress",
  },
  "trend-4": {
    progress: 22,
    totalLessons: 100,
    completedLessons: 22,
    lastLesson: "Day 22: Pong Game",
    status: "in-progress",
  },
  "trend-5": {
    progress: 100,
    totalLessons: 36,
    completedLessons: 36,
    lastLesson: "Final Practice Exam",
    status: "completed",
  },
  "trend-3": {
    progress: 78,
    totalLessons: 24,
    completedLessons: 19,
    lastLesson: "Prompting Fundamentals",
    status: "in-progress",
  },
  "dev-2": {
    progress: 100,
    totalLessons: 18,
    completedLessons: 18,
    lastLesson: "Advanced Integrations",
    status: "completed",
  },
}

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

  useEffect(() => {
    const loadEnrolled = async () => {
      if (isLoading) {
        return
      }

      if (!user?.roles?.includes("student")) {
        setEnrolledClasses([])
        return
      }

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
    }

    loadEnrolled().catch((err) => {
      console.error('Failed to load enrolled classes', err)
      setEnrolledClasses([])
    })
  }, [isLoading, user?.id, user?.roles])

  const enrolledCourses = useMemo(() => {
    return (enrolledClasses ?? []).map((course) => {
      const progress = progressByCourseId[course.id]
      if (progress) {
        return {
          ...course,
          ...progress,
        }
      }

      return {
        ...course,
        progress: 0,
        totalLessons: 0,
        completedLessons: 0,
        lastLesson: "Not started yet",
        status: "in-progress" as const,
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
      <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
        <div className="mb-4 sm:mb-6">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-2">My Courses</h1>
          <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">Track your learning progress and continue where you left off</p>
        </div>

        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 w-4 h-4" />
              <Input
                placeholder="Search enrolled courses..."
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                className="pl-10 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant={filterMode === "all" ? "default" : "outline"}
              onClick={() => setFilterMode("all")}
              className="h-9"
            >
              All
            </Button>
            <Button
              variant={filterMode === "in-progress" ? "default" : "outline"}
              onClick={() => setFilterMode("in-progress")}
              className="h-9"
            >
              In Progress
            </Button>
            <Button
              variant={filterMode === "completed" ? "default" : "outline"}
              onClick={() => setFilterMode("completed")}
              className="h-9"
            >
              Completed
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {filteredCourses.map((course) => (
            <Card key={course.id} className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
              <CardContent className="p-4 space-y-4">
                <div className="rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-700">
                  <img
                    src={
                      getImageUrl(course.thumbnail_url) ||
                      "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?q=80&w=1200&auto=format&fit=crop"
                    }
                    alt={course.name}
                    className="h-40 w-full object-cover"
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="text-sm font-semibold text-gray-900 dark:text-white line-clamp-2">
                        {course.name}
                      </h3>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{course.teacher?.name || "Instructor"}</p>
                    </div>
                    <Badge variant="secondary" className="text-[11px]">
                      {course.category?.name || "General"}
                    </Badge>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                      <span>{course.completedLessons}/{course.totalLessons} lessons</span>
                      <span>{course.progress}%</span>
                    </div>
                    <Progress value={course.progress} className="h-2" />
                  </div>

                  <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                    <span>Last lesson:</span>
                    <span className="text-gray-700 dark:text-gray-300 line-clamp-1">{course.lastLesson}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <Badge className={
                    course.status === "completed"
                      ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200"
                      : "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                  }>
                    {course.status === "completed" ? "Completed" : "In Progress"}
                  </Badge>
                  <Link href={`/my-course/${course.id}`}>
                    <Button variant="outline" size="sm" className="gap-2">
                      <PlayCircle className="w-4 h-4" />
                      {course.status === "completed" ? "Review" : "Continue"}
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredCourses.length === 0 && (
          <div className="text-center py-16 text-gray-500 dark:text-gray-400">
            <p className="mb-4">No courses found. Join a course to start learning.</p>
            <Link href="/courses">
              <Button variant="outline">Browse Courses</Button>
            </Link>
          </div>
        )}
      </div>
    </ProtectedRoute>
  )
}
