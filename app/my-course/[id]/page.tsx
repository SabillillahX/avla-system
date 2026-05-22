"use client"

import Link from "next/link"
import { useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { ProtectedRoute } from "@/components/auth/ProtectedRoute"
import { getCourseByParam } from "@/lib/mock-courses"

export default function CourseMaterialPage({ params }: { params: { id: string } }) {
  const course = useMemo(() => getCourseByParam(params.id), [params.id])

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
      <div className="p-6 space-y-6">
        <div>
          <p className="text-sm text-gray-500 dark:text-gray-400">{course.category}</p>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">{course.title}</h1>
          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
            <span>Instructor: {course.instructor}</span>
            <Badge variant="secondary">{course.level}</Badge>
            <span>{course.lessons} lessons</span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 lg:col-span-2">
            <CardContent className="p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Lesson 1: Getting Started</h2>
              <div className="rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-700 h-64 flex items-center justify-center text-gray-500">
                Video player placeholder
              </div>
              <div className="mt-4 text-sm text-gray-600 dark:text-gray-300">
                Follow the lesson materials and keep track of your progress. This section will be connected to the backend later.
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
            <CardContent className="p-6">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Course Outline</h3>
              <ol className="space-y-2 text-sm text-gray-600 dark:text-gray-300 list-decimal list-inside">
                {course.curriculum.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ol>
              <div className="mt-6 flex flex-col gap-2">
                <Button>Mark as Completed</Button>
                <Link href="/my-course">
                  <Button variant="outline">Back to My Courses</Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </ProtectedRoute>
  )
}
