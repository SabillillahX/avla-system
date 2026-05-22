"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { ProtectedRoute } from "@/components/auth/ProtectedRoute"
import { getCourseById } from "@/lib/mock-courses"
import { isCourseJoined, joinCourse, leaveCourse } from "@/lib/course-storage"
import { Star } from "lucide-react"

export default function CourseDetailPage({ params }: { params: { id: string } }) {
  const course = useMemo(() => getCourseById(params.id), [params.id])
  const [joined, setJoined] = useState(false)

  useEffect(() => {
    if (!course) return
    setJoined(isCourseJoined(course.id))
  }, [course])

  const handleJoin = () => {
    if (!course) return
    const ids = joined ? leaveCourse(course.id) : joinCourse(course.id)
    setJoined(ids.includes(course.id))
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
      <div className="p-6 space-y-8">
        <div className="flex flex-col lg:flex-row gap-6">
          <div className="flex-1">
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">{course.category}</p>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-3">{course.title}</h1>
            <p className="text-gray-600 dark:text-gray-400 mb-4">{course.description}</p>
            <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-300 mb-4">
              <span className="font-semibold text-amber-600 dark:text-amber-400">{course.rating.toFixed(1)}</span>
              <div className="flex items-center gap-1">
                {Array.from({ length: 5 }).map((_, index) => (
                  <Star
                    key={`detail-star-${index}`}
                    className={`h-4 w-4 ${index < Math.round(course.rating)
                      ? "text-amber-500 fill-amber-500"
                      : "text-gray-300 dark:text-gray-600"}`}
                  />
                ))}
              </div>
              <span>({course.ratingCount.toLocaleString("en-US")})</span>
              <span>Instructor: {course.instructor}</span>
            </div>
            <div className="flex items-center gap-3 mb-6">
              <span className="text-2xl font-semibold text-gray-900 dark:text-white">{course.price}</span>
              <span className="text-sm text-gray-400 line-through">{course.originalPrice}</span>
              {course.badges.map((badge) => (
                <Badge key={`badge-${badge}`} variant="secondary">
                  {badge}
                </Badge>
              ))}
            </div>
            <div className="flex items-center gap-3">
              <Button onClick={handleJoin} className="min-w-[140px]">
                {joined ? "Leave Course" : "Join Course"}
              </Button>
              {joined && (
                <>
                  <Link href={`/my-course/${encodeURIComponent(course.title)}`}>
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
                  <img src={course.imageUrl} alt={course.title} className="h-52 w-full object-cover" />
                </div>
                <div className="space-y-2 text-sm text-gray-600 dark:text-gray-300">
                  <div className="flex items-center justify-between">
                    <span>Level</span>
                    <span className="font-semibold text-gray-900 dark:text-white">{course.level}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Duration</span>
                    <span className="font-semibold text-gray-900 dark:text-white">{course.durationHours} hours</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Lessons</span>
                    <span className="font-semibold text-gray-900 dark:text-white">{course.lessons} lessons</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Language</span>
                    <span className="font-semibold text-gray-900 dark:text-white">{course.language}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Last updated</span>
                    <span className="font-semibold text-gray-900 dark:text-white">{course.lastUpdated}</span>
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
                {course.whatYouLearn.map((item) => (
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
                {course.curriculum.map((item) => (
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
