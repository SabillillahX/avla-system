'use client'

import Link from "next/link"
import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { ProtectedRoute } from "@/components/auth/ProtectedRoute"
import { topDevelopmentCourses, trendingCourses } from "@/lib/mock-courses"
import { getJoinedCourseIds } from "@/lib/course-storage"
import { ChevronRight, Star } from "lucide-react"

const formatCount = (value: number) => value.toLocaleString("en-US")

export default function CoursesPage() {
  const [joinedIds, setJoinedIds] = useState<string[]>([])

  useEffect(() => {
    setJoinedIds(getJoinedCourseIds())
  }, [])

  return (
    <ProtectedRoute>
      <div className="p-6 space-y-10">
        <section>
          <div className="mb-6">
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Thursday, 20th February</p>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Good Evening! John, ready to learn?</h2>

            <div className="flex items-center space-x-6 mb-6">
              <Button
                variant="outline"
                size="sm"
                className="border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 bg-transparent"
              >
                Share
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 bg-transparent"
              >
                Browse Courses
              </Button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-6">
            <div className="flex items-center">
              <span className="font-semibold text-gray-900 dark:text-white">12hrs</span>
              <span className="text-sm text-gray-500 dark:text-gray-400 ml-1">Hours Learned</span>
            </div>
            <div className="flex items-center">
              <span className="font-semibold text-gray-900 dark:text-white">24</span>
              <span className="text-sm text-gray-500 dark:text-gray-400 ml-1">Courses Completed</span>
            </div>
            <div className="flex items-center">
              <span className="font-semibold text-gray-900 dark:text-white">7</span>
              <span className="text-sm text-gray-500 dark:text-gray-400 ml-1">Courses In Progress</span>
            </div>
          </div>
        </section>

        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Trending courses</h2>
          </div>
          <div className="relative">
            <div className="flex gap-5 overflow-x-auto pb-2 pr-10">
              {trendingCourses.map((course) => (
                <div key={course.id} className="w-[250px] shrink-0">
                  <Link href={`/courses/${course.id}`} className="block">
                    <div className="rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800">
                      <img
                        src={course.imageUrl}
                        alt={course.title}
                        className="h-[140px] w-full object-cover"
                      />
                    </div>
                  </Link>
                  <div className="mt-3 space-y-2">
                    <Link href={`/courses/${course.id}`} className="block">
                      <h3 className="text-sm font-semibold text-gray-900 dark:text-white line-clamp-2 hover:underline">
                        {course.title}
                      </h3>
                    </Link>
                    <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-1">
                      {course.subtitle}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-gray-700 dark:text-gray-300">
                      <span className="font-semibold text-amber-700 dark:text-amber-400">
                        {course.rating.toFixed(1)}
                      </span>
                      <div className="flex items-center gap-1">
                        {Array.from({ length: 5 }).map((_, index) => (
                          <Star
                            key={`${course.id}-star-${index}`}
                            className={`h-3 w-3 ${index < Math.round(course.rating)
                              ? "text-amber-500 fill-amber-500"
                              : "text-gray-300 dark:text-gray-600"
                              }`}
                          />
                        ))}
                      </div>
                      <span>({formatCount(course.ratingCount)})</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-gray-900 dark:text-white">
                        {course.price}
                      </span>
                      <span className="text-xs text-gray-400 line-through">{course.originalPrice}</span>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      {joinedIds.includes(course.id) && (
                        <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                          Joined
                        </span>
                      )}
                      {course.badges.map((badge) => (
                        <span
                          key={`${course.id}-${badge}`}
                          className={`px-2 py-0.5 rounded-md text-[11px] font-semibold ${
                            badge === "Premium"
                              ? "bg-indigo-600 text-white"
                              : "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200"
                          }`}
                        >
                          {badge}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <Button
              variant="outline"
              size="icon"
              className="absolute right-0 top-12 h-10 w-10 rounded-full bg-white dark:bg-gray-800 shadow"
              aria-label="Scroll right"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </section>

        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Top courses in Development</h2>
          </div>
          <div className="relative">
            <div className="flex gap-5 overflow-x-auto pb-2 pr-10">
              {topDevelopmentCourses.map((course) => (
                <div key={course.id} className="w-[250px] shrink-0">
                  <Link href={`/courses/${course.id}`} className="block">
                    <div className="rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800">
                      <img
                        src={course.imageUrl}
                        alt={course.title}
                        className="h-[140px] w-full object-cover"
                      />
                    </div>
                  </Link>
                  <div className="mt-3 space-y-2">
                    <Link href={`/courses/${course.id}`} className="block">
                      <h3 className="text-sm font-semibold text-gray-900 dark:text-white line-clamp-2 hover:underline">
                        {course.title}
                      </h3>
                    </Link>
                    <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-1">
                      {course.subtitle}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-gray-700 dark:text-gray-300">
                      <span className="font-semibold text-amber-700 dark:text-amber-400">
                        {course.rating.toFixed(1)}
                      </span>
                      <div className="flex items-center gap-1">
                        {Array.from({ length: 5 }).map((_, index) => (
                          <Star
                            key={`${course.id}-star-${index}`}
                            className={`h-3 w-3 ${index < Math.round(course.rating)
                              ? "text-amber-500 fill-amber-500"
                              : "text-gray-300 dark:text-gray-600"
                              }`}
                          />
                        ))}
                      </div>
                      <span>({formatCount(course.ratingCount)})</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-gray-900 dark:text-white">
                        {course.price}
                      </span>
                      <span className="text-xs text-gray-400 line-through">{course.originalPrice}</span>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      {joinedIds.includes(course.id) && (
                        <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                          Joined
                        </span>
                      )}
                      {course.badges.map((badge) => (
                        <span
                          key={`${course.id}-${badge}`}
                          className={`px-2 py-0.5 rounded-md text-[11px] font-semibold ${
                            badge === "Premium"
                              ? "bg-indigo-600 text-white"
                              : "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200"
                          }`}
                        >
                          {badge}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <Button
              variant="outline"
              size="icon"
              className="absolute right-0 top-12 h-10 w-10 rounded-full bg-white dark:bg-gray-800 shadow"
              aria-label="Scroll right"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </section>
      </div>
    </ProtectedRoute>
  )
}
