"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { ProtectedRoute } from "@/components/auth/ProtectedRoute"
import { useAuth } from "@/contexts/AuthContext"
import { classesApi, type CourseClass } from "@/lib/api/classes"
import { formatDateLabel, formatPrice, getCourseDisplayPrice, getCourseOriginalPrice } from "@/lib/class-utils"
import { Star } from "lucide-react"

const extractCourseArray = (value: unknown): CourseClass[] => {
  if (Array.isArray(value)) {
    return value as CourseClass[]
  }

  if (value && typeof value === "object" && "data" in value && Array.isArray((value as { data?: unknown }).data)) {
    return (value as { data: CourseClass[] }).data
  }

  return []
}

export default function CourseDetailPage({ params }: { params: { id: string } }) {
  const { user } = useAuth()
  const [course, setCourse] = useState<CourseClass | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [joined, setJoined] = useState(false)
  const [isCheckingEnrollment, setIsCheckingEnrollment] = useState(true)
  const canEnroll = user?.roles?.includes("student")

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

  useEffect(() => {
    const loadEnrolled = async () => {
      if (!user?.roles?.includes("student")) {
        setJoined(false)
        setIsCheckingEnrollment(false)
        return
      }

      setIsCheckingEnrollment(true)

      try {
        const token = typeof window !== "undefined" ? localStorage.getItem("auth_token") : null
        const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/classes/enrolled`, {
          headers: {
            Accept: "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        })
        const payload = await response.json()
        const enrolledIds = extractCourseArray(payload.data).map((item) => String(item.id))
        setJoined(enrolledIds.includes(String(params.id)))
      } catch {
        setJoined(false)
      } finally {
        setIsCheckingEnrollment(false)
      }
    }

    loadEnrolled()
  }, [params.id, user?.roles])

  const handleJoin = async () => {
    if (!course) return
    if (joined) return
    await classesApi.enroll(course.id)
    setJoined(true)
  }

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
          <Link href="/courses" className="text-blue-600 dark:text-blue-400 hover:underline">Back to Courses</Link>
        </div>
      </ProtectedRoute>
    )
  }

  return (
    <ProtectedRoute>
      <div className="p-4 sm:p-6 space-y-6 sm:space-y-8">
        <div className="flex flex-col lg:flex-row gap-6">
          <div className="flex-1">
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">{course.category?.name || "General"}</p>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-3">{course.name}</h1>
            <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 mb-4">{course.description || course.short_description}</p>
            <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-sm text-gray-600 dark:text-gray-300 mb-4">
              <span className="font-semibold text-amber-600 dark:text-amber-400">{(course.rating ?? 0).toFixed(1)}</span>
              <div className="flex items-center gap-1">
                {Array.from({ length: 5 }).map((_, index) => (
                  <Star
                    key={`detail-star-${index}`}
                    className={`h-4 w-4 ${index < Math.round(course.rating ?? 0)
                      ? "text-amber-500 fill-amber-500"
                      : "text-gray-300 dark:text-gray-600"}`}
                  />
                ))}
              </div>
              <span>({course.rating_count ?? 0})</span>
              <span>Instructor: {course.teacher?.name || "Instructor"}</span>
            </div>
            <div className="flex items-center gap-3 mb-6">
              <span className="text-2xl font-semibold text-gray-900 dark:text-white">{getCourseDisplayPrice(course)}</span>
              {getCourseOriginalPrice(course) && (
                <span className="text-sm text-gray-400 line-through">{getCourseOriginalPrice(course)}</span>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              <Button onClick={handleJoin} className="min-w-[140px]" disabled={!canEnroll || joined || isCheckingEnrollment}>
                {isCheckingEnrollment ? "Checking..." : joined ? "Enrolled" : "Join Course"}
              </Button>
              {joined && (
                <>
                  <Link href={`/my-course/${course.id}`}>
                    <Button variant="outline">Start Learning</Button>
                  </Link>
                  <Link href="/my-course">
                    <Button variant="ghost">My Courses</Button>
                  </Link>
                </>
              )}
            </div>
          </div>
          <div className="w-full lg:w-[420px]">
            <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
              <CardContent className="p-4 space-y-4">
                <div className="rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-700">
                  <img
                    src={
                      course.thumbnail_url ||
                      "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?q=80&w=1200&auto=format&fit=crop"
                    }
                    alt={course.name}
                    className="h-52 w-full object-cover"
                  />
                </div>
                <div className="space-y-2 text-sm text-gray-600 dark:text-gray-300">
                  <div className="flex items-center justify-between">
                    <span>Level</span>
                    <span className="font-semibold text-gray-900 dark:text-white">{course.level || "Beginner"}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Duration</span>
                    <span className="font-semibold text-gray-900 dark:text-white">-</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Lessons</span>
                    <span className="font-semibold text-gray-900 dark:text-white">-</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Language</span>
                    <span className="font-semibold text-gray-900 dark:text-white">{course.language || "-"}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Last updated</span>
                    <span className="font-semibold text-gray-900 dark:text-white">{formatDateLabel(course.updated_at)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
            <CardContent className="p-5">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">What you will learn</h2>
              <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-300">
                {(course.what_you_will_learn || ["Lesson objectives will be updated soon."]).map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <span className="mt-1 h-2 w-2 rounded-full bg-blue-500" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
            <CardContent className="p-5">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Course content</h2>
              <ol className="space-y-2 text-sm text-gray-600 dark:text-gray-300 list-decimal list-inside">
                {(course.requirements || ["Content outline will be available soon."]).map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ol>
            </CardContent>
          </Card>
        </div>
      </div>
    </ProtectedRoute>
  )
}
