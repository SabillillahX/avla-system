"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { ProtectedRoute } from "@/components/auth/ProtectedRoute"
import { classesApi, type CourseClass } from "@/lib/api/classes"
import { formatDateLabel, formatPrice, extractCourseArray, getImageUrl } from "@/lib/class-utils"
import { Plus, Search, Edit2, Eye, EyeOff, Trash2, Clock, Users, BookOpen } from "lucide-react"
import { ClassRow } from "@/lib/types/course-management"

const mapClassRow = (course: CourseClass): ClassRow => {
  return {
    id: course.id,
    title: course.name,
    category: course.category?.name || "General",
    price: course.is_free ? "Free" : formatPrice(course.price),
    imageUrl:
      getImageUrl(course.thumbnail_url) ||
      "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?q=80&w=1200&auto=format&fit=crop",
    description: course.description || course.short_description || "No description yet.",
    status: (course.status as ClassRow["status"]) || "draft",
    students: course.students_count || course.students?.length || 0,
    updatedAt: formatDateLabel(course.updated_at),
    raw: course,
  }
}

export default function ClassManagementPage() {
  const [classes, setClasses] = useState<ClassRow[]>([])
  const [searchQuery, setSearchQuery] = useState("")

  const loadClasses = async () => {
    const response = await classesApi.list()
    const rows = extractCourseArray(response?.data).map(mapClassRow)
    setClasses(rows)
  }

  useEffect(() => {
    loadClasses()
  }, [])

  const filteredClasses = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()
    if (!query) return classes
    return classes.filter((item) =>
      item.title.toLowerCase().includes(query) ||
      item.category.toLowerCase().includes(query)
    )
  }, [classes, searchQuery])

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this class?")) return;
    await classesApi.remove(id)
    await loadClasses()
  }

  const togglePublish = async (id: string) => {
    const current = classes.find((item) => item.id === id)
    if (!current) return
    const nextStatus = current.status === "published" ? "draft" : "published"
    await classesApi.update(id, {
      name: current.title,
      description: current.description,
      category_id: current.raw.category_id,
      status: nextStatus,
      short_description: current.raw.short_description,
      thumbnail_url: current.raw.thumbnail_url,
      price: current.raw.price,
      is_free: current.raw.is_free,
      language: current.raw.language,
      has_certificate: current.raw.has_certificate,
    })
    await loadClasses()
  }

  return (
    <ProtectedRoute requireRole={["admin", "teacher"]}>
      <div className="max-w-6xl mx-auto p-6 sm:p-8 lg:p-10 space-y-6 sm:space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-900 dark:text-white">Class Management</h1>
            <p className="text-sm sm:text-base text-gray-500 dark:text-gray-400 mt-1">
              Create new classes and manage your educational content.
            </p>
          </div>
          <Link href="/course-management/create">
            <Button className="gap-2 shadow-sm w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 text-white border-transparent">
              <Plus className="h-4 w-4" />
              Create Class
            </Button>
          </Link>
        </div>

        <Card className="shadow-sm border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900/50">
          <CardContent className="p-6 sm:p-8 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 dark:border-gray-800 pb-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Your Classes</h2>
              <div className="relative w-full sm:w-72">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search by title or category..."
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  className="pl-9 bg-gray-50 dark:bg-gray-800 border-transparent focus-visible:ring-indigo-500 dark:focus-visible:ring-indigo-400"
                />
              </div>
            </div>

            <div className="space-y-4">
              {filteredClasses.map((item) => (
                <div
                  key={item.id}
                  className="group flex flex-col lg:flex-row gap-5 rounded-xl border border-gray-100 bg-white hover:border-gray-300 dark:border-gray-800 dark:bg-gray-900 dark:hover:border-gray-700 p-6 sm:p-7 transition-all duration-200 hover:shadow-md"
                >
                  <div className="w-full lg:w-56 h-36 shrink-0 overflow-hidden rounded-lg bg-gray-100 dark:bg-gray-800 relative">
                    {/* Reverted to standard img to prevent Next.js errors about missing width/height properties when using unoptimized remote images without fill */}
                    <img
                      src={item.imageUrl}
                      alt={item.title}
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                    <div className="absolute top-2 right-2">
                      <Badge
                        variant="secondary"
                        className={
                          item.status === "published"
                            ? "bg-emerald-500/10 text-emerald-700 border-emerald-200/50 dark:bg-emerald-500/20 dark:text-emerald-400 dark:border-emerald-500/30 font-medium backdrop-blur-md"
                            : "bg-amber-500/10 text-amber-700 border-amber-200/50 dark:bg-amber-500/20 dark:text-amber-400 dark:border-amber-500/30 font-medium backdrop-blur-md"
                        }
                      >
                        {item.status === "published" ? "Published" : "Draft"}
                      </Badge>
                    </div>
                  </div>

                  <div className="flex-1 flex flex-col justify-between space-y-4">
                    <div className="space-y-1.5">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white line-clamp-1 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                        {item.title}
                      </h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2">
                        {item.description}
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs sm:text-sm text-gray-600 dark:text-gray-300">
                      <div className="flex items-center gap-1.5 bg-gray-100 dark:bg-gray-800 px-2.5 py-1 rounded-md font-medium text-gray-700 dark:text-gray-300">
                        <BookOpen className="w-3.5 h-3.5 text-indigo-500" />
                        {item.category}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-gray-900 dark:text-white">{item.price}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5 text-gray-400" />
                        <span>{item.students} students</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-gray-400" />
                        <span>Updated {item.updatedAt}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-row lg:flex-col justify-center gap-2 border-t lg:border-t-0 lg:border-l border-gray-100 dark:border-gray-800 pt-4 lg:pt-0 lg:pl-5 min-w-[140px]">
                    <Link href={`/course-management/create?edit=${item.id}`} className="w-full">
                      <Button variant="outline" size="sm" className="w-full justify-start gap-2 shadow-sm border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800">
                        <Edit2 className="w-3.5 h-3.5" /> Edit Details
                      </Button>
                    </Link>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => togglePublish(item.id)}
                      className="w-full justify-start gap-2 shadow-sm border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800"
                    >
                      {item.status === "published" ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      {item.status === "published" ? "Unpublish" : "Publish"}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(item.id)}
                      className="w-full justify-start gap-2 text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Delete
                    </Button>
                  </div>
                </div>
              ))}

              {filteredClasses.length === 0 && (
                <div className="flex flex-col items-center justify-center text-center py-16 px-4">
                  <div className="bg-gray-100 dark:bg-gray-800 rounded-full p-4 mb-4">
                    <BookOpen className="h-8 w-8 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">No classes found</h3>
                  <p className="text-gray-500 dark:text-gray-400 max-w-sm mx-auto mb-6">
                    {searchQuery ? "We couldn't find any classes matching your search. Try a different term." : "You haven't created any classes yet. Start building your curriculum today."}
                  </p>
                  {!searchQuery && (
                    <Link href="/course-management/create">
                      <Button className="bg-indigo-600 hover:bg-indigo-700 text-white">
                        <Plus className="w-4 h-4 mr-2" /> Create Your First Class
                      </Button>
                    </Link>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </ProtectedRoute>
  )
}
