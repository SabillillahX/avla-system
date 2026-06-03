"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { ProtectedRoute } from "@/components/auth/ProtectedRoute"
import { classesApi, type CourseClass } from "@/lib/api/classes"

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
      <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
        <div>
          <p className="text-sm text-gray-500 dark:text-gray-400">{course.category?.name || "General"}</p>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-2">{course.name}</h1>
          <div className="flex flex-wrap items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
            <span>Instructor: {course.teacher?.name || "Instructor"}</span>
            <Badge variant="secondary">{course.level || "Beginner"}</Badge>
            <span>- lessons</span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 lg:col-span-2">
            <CardContent className="p-4 sm:p-6">
              <h2 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white mb-4">Lesson 1: Getting Started</h2>
              <div className="rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-700 h-48 sm:h-64 flex items-center justify-center text-gray-500 text-sm sm:text-base">
                Video player placeholder
              </div>
              <div className="mt-4 text-sm text-gray-600 dark:text-gray-300">
                Follow the lesson materials and keep track of your progress. This section will be connected to the backend later.
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
            <CardContent className="p-4 sm:p-6">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Course Outline</h3>
              <ol className="space-y-2 text-sm text-gray-600 dark:text-gray-300 list-decimal list-inside">
                {(course.requirements || ["Course outline will be available soon."]).map((item) => (
                  <li key={item} className="break-words">{item}</li>
                ))}
              </ol>
              <div className="mt-6 flex flex-col gap-2">
                <Button className="w-full">Mark as Completed</Button>
                <Link href="/my-course" className="w-full">
                  <Button variant="outline" className="w-full">Back to My Courses</Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </ProtectedRoute>
  )
}
