'use client'

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { Button } from "@/lib/components/ui/button"
import { Card, CardContent } from "@/lib/components/ui/card"
import { Input } from "@/lib/components/ui/input"
import { ProtectedRoute } from "@/lib/components/auth/ProtectedRoute"
import { useAuth } from "@/lib/contexts/AuthContext"
import { type CourseClass } from "@/lib/api/classes"
import { formatDateLabel, formatPrice, getCourseDisplayPrice, getCourseOriginalPrice, getImageUrl } from "@/lib/class-utils"
import { ChevronRight, Search, Star } from "lucide-react"

const formatCount = (value: number) => value.toLocaleString("en-US")
const backendBaseUrl = process.env.NEXT_PUBLIC_BACKEND_URL

const extractCourseArray = (value: unknown): CourseClass[] => {
  if (Array.isArray(value)) {
    return value as CourseClass[]
  }

  if (value && typeof value === "object" && "data" in value && Array.isArray((value as { data?: unknown }).data)) {
    return (value as { data: CourseClass[] }).data
  }

  return []
}

export default function CoursesPage() {
  const { user, isLoading } = useAuth()
  const [joinedIds, setJoinedIds] = useState<string[]>([])
  const [classes, setClasses] = useState<CourseClass[]>([])
  const [isClassesLoading, setIsClassesLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")

  useEffect(() => {
    const loadClasses = async () => {
      if (isLoading) {
        return
      }

      try {
        setIsClassesLoading(true)
        const token = typeof window !== "undefined" ? localStorage.getItem("auth_token") : null
        const response = await fetch(`${backendBaseUrl}/courses`, {
          headers: {
            Accept: "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        })

        if (!response.ok) {
          throw new Error(`Failed to load classes: ${response.status}`)
        }

        const payload = await response.json()
        setClasses(extractCourseArray(payload?.data))
      } catch (err) {
        console.error('Failed to load classes', err)
        setClasses([])
      } finally {
        setIsClassesLoading(false)
      }
    }

    loadClasses()
  }, [isLoading, user?.id])

  useEffect(() => {
    const loadEnrolled = async () => {
      if (isLoading) {
        return
      }

      if (!user?.roles?.includes("student")) {
        setJoinedIds([])
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
        setJoinedIds(extractCourseArray(payload?.data).map((item) => item.id))
      } catch (err) {
        console.error('Failed to load enrolled classes', err)
        setJoinedIds([])
      }
    }

    loadEnrolled()
  }, [isLoading, user?.roles])

  const query = searchQuery.trim().toLowerCase()

  const filteredCourses = useMemo(() => {
    const published = (classes ?? []).filter((item) => item.status === "published")
    if (!query) return published
    return published.filter((item) =>
      item.name.toLowerCase().includes(query) ||
      (item.category?.name || "").toLowerCase().includes(query) ||
      (item.short_description || item.description || "").toLowerCase().includes(query)
    )
  }, [classes, query])

  const trendingCourses = useMemo(() => {
    return filteredCourses.slice(0, 6)
  }, [filteredCourses])

  const topDevelopmentCourses = useMemo(() => {
    const development = filteredCourses.filter((item) =>
      (item.category?.name || "").toLowerCase().includes("development")
    )
    return development.length > 0 ? development.slice(0, 6) : filteredCourses.slice(0, 6)
  }, [filteredCourses])

  const courseStats = useMemo(() => {
    const courseCount = filteredCourses.length
    const categoryCount = new Set(
      filteredCourses
        .map((course) => course.category?.name?.trim())
        .filter((category): category is string => Boolean(category))
    ).size

    return {
      courseCount,
      categoryCount,
    }
  }, [filteredCourses])

  const mapCourseCard = (course: CourseClass) => ({
    id: course.id,
    title: course.name,
    subtitle: course.short_description || course.description || "",
    instructor: course.teacher?.name || "Instructor",
    rating: course.rating ?? 0,
    ratingCount: course.rating_count ?? 0,
    price: getCourseDisplayPrice(course),
    originalPrice: getCourseOriginalPrice(course),
    badges: (course.badges && course.badges.length > 0) ? course.badges : [course.is_free ? "Free" : ""].filter(Boolean),
    imageUrl:
      getImageUrl(course.thumbnail_url) ||
      "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?q=80&w=1200&auto=format&fit=crop",
    category: course.category?.name || "General",
    lastUpdated: formatDateLabel(course.updated_at),
    level: course.level || "Beginner",
  })

  const greetingName = user?.name?.split(" ")[0] || "Student"
  const todayLabel = new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(new Date())

  return (
    <ProtectedRoute>
      <div className="p-6 sm:p-8 space-y-6 sm:space-y-10">
        <section>
          <div className="mb-4 sm:mb-6">
            <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mb-1">{todayLabel}</p>
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-3 sm:mb-4">Good Evening! {greetingName}, ready to learn?</h2>

            <div className="relative w-full max-w-md mb-4 sm:mb-6">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
              <Input
                placeholder="Search courses by title, category, or description..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 focus-visible:ring-blue-500"
              />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 max-w-xl">
            <div className="rounded-lg border border-gray-200 bg-white/70 px-3 py-2 shadow-sm dark:border-gray-700 dark:bg-gray-800/60">
              <span className="block text-lg font-semibold text-gray-900 dark:text-white">{formatCount(courseStats.courseCount)}</span>
              <span className="text-xs text-gray-500 dark:text-gray-400">Courses Available</span>
            </div>
            <div className="rounded-lg border border-gray-200 bg-white/70 px-3 py-2 shadow-sm dark:border-gray-700 dark:bg-gray-800/60">
              <span className="block text-lg font-semibold text-gray-900 dark:text-white">{formatCount(courseStats.categoryCount)}</span>
              <span className="text-xs text-gray-500 dark:text-gray-400">Categories</span>
            </div>
          </div>
        </section>

        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Trending courses</h2>
          </div>
          {isClassesLoading ? (
            <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
              <CardContent className="p-8 text-base text-gray-500 dark:text-gray-400">
                Loading courses...
              </CardContent>
            </Card>
          ) : null}
          <div className="relative">
            <div className="flex gap-4 sm:gap-5 overflow-x-auto pb-2 pr-10 snap-x snap-mandatory">
              {trendingCourses.map((course) => {
                const card = mapCourseCard(course)
                return (
                  <div key={course.id} className="w-[200px] sm:w-[250px] shrink-0 snap-start">
                    <Link href={`/courses/${course.id}`} className="block">
                      <div className="rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800">
                        <img
                          src={card.imageUrl}
                          alt={card.title}
                          className="h-[140px] w-full object-cover"
                        />
                      </div>
                    </Link>
                    <div className="mt-3 space-y-2">
                      <Link href={`/courses/${course.id}`} className="block">
                        <h3 className="text-sm font-semibold text-gray-900 dark:text-white line-clamp-2 hover:underline">
                          {card.title}
                        </h3>
                      </Link>
                      <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-1">
                        {card.subtitle}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-gray-700 dark:text-gray-300">
                        <span className="font-semibold text-amber-700 dark:text-amber-400">
                          {card.rating.toFixed(1)}
                        </span>
                        <div className="flex items-center gap-1">
                          {Array.from({ length: 5 }).map((_, index) => (
                            <Star
                              key={`${course.id}-star-${index}`}
                              className={`h-3 w-3 ${index < Math.round(card.rating)
                                ? "text-amber-500 fill-amber-500"
                                : "text-gray-300 dark:text-gray-600"
                                }`}
                            />
                          ))}
                        </div>
                        <span>({formatCount(card.ratingCount)})</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-gray-900 dark:text-white">
                          {card.price}
                        </span>
                        {card.originalPrice && (
                          <span className="text-xs text-gray-400 line-through">{card.originalPrice}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        {joinedIds.includes(course.id) && (
                          <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                            Joined
                          </span>
                        )}
                        {card.badges.map((badge) => (
                          <span
                            key={`${course.id}-${badge}`}
                            className={`px-2 py-0.5 rounded-md text-[11px] font-semibold ${badge === "Premium"
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
                )
              })}
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
            <div className="flex gap-4 sm:gap-5 overflow-x-auto pb-2 pr-10 snap-x snap-mandatory">
              {topDevelopmentCourses.map((course) => {
                const card = mapCourseCard(course)
                return (
                  <div key={course.id} className="w-[200px] sm:w-[250px] shrink-0 snap-start">
                    <Link href={`/courses/${course.id}`} className="block">
                      <div className="rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800">
                        <img
                          src={card.imageUrl}
                          alt={card.title}
                          className="h-[140px] w-full object-cover"
                        />
                      </div>
                    </Link>
                    <div className="mt-3 space-y-2">
                      <Link href={`/courses/${course.id}`} className="block">
                        <h3 className="text-sm font-semibold text-gray-900 dark:text-white line-clamp-2 hover:underline">
                          {card.title}
                        </h3>
                      </Link>
                      <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-1">
                        {card.subtitle}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-gray-700 dark:text-gray-300">
                        <span className="font-semibold text-amber-700 dark:text-amber-400">
                          {card.rating.toFixed(1)}
                        </span>
                        <div className="flex items-center gap-1">
                          {Array.from({ length: 5 }).map((_, index) => (
                            <Star
                              key={`${course.id}-star-${index}`}
                              className={`h-3 w-3 ${index < Math.round(card.rating)
                                ? "text-amber-500 fill-amber-500"
                                : "text-gray-300 dark:text-gray-600"
                                }`}
                            />
                          ))}
                        </div>
                        <span>({formatCount(card.ratingCount)})</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-gray-900 dark:text-white">
                          {card.price}
                        </span>
                        {card.originalPrice && (
                          <span className="text-xs text-gray-400 line-through">{card.originalPrice}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        {joinedIds.includes(course.id) && (
                          <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                            Joined
                          </span>
                        )}
                        {card.badges.map((badge) => (
                          <span
                            key={`${course.id}-${badge}`}
                            className={`px-2 py-0.5 rounded-md text-[11px] font-semibold ${badge === "Premium"
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
                )
              })}
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

        {!isClassesLoading && filteredCourses.length === 0 && (
          <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
            <CardContent className="p-8 text-center text-gray-500 dark:text-gray-400">
              No published courses yet. Run the class seeder and refresh the page.
            </CardContent>
          </Card>
        )}
      </div>
    </ProtectedRoute>
  )
}
