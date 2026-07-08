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
import { Plus, Search, Edit2, Eye, EyeOff, Trash2, Clock, Users, BookOpen, CheckSquare } from "lucide-react"
import { ClassRow } from "@/lib/types/course-management"
import { toast } from "sonner"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

const mapClassRow = (course: CourseClass): ClassRow => {
  let displayStatus = (course.status as ClassRow["status"]) || "draft"

  // Automatically revert to draft visually if published but no active/upcoming batches
  if (displayStatus === "published") {
    const hasActiveBatch = course.batches?.some(b => b.status === "active" || b.status === "upcoming")
    if (!hasActiveBatch) {
      displayStatus = "draft"
    }
  }

  return {
    id: course.id,
    title: course.name,
    category: course.category?.name || "General",
    price: course.is_free ? "Free" : formatPrice(course.price),
    imageUrl:
      getImageUrl(course.thumbnail_url) ||
      "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?q=80&w=1200&auto=format&fit=crop",
    description: course.description || course.short_description || "No description yet.",
    status: displayStatus,
    students: course.students_count || course.students?.length || 0,
    updatedAt: formatDateLabel(course.updated_at),
    raw: course,
  }
}

export default function ClassManagementPage() {
  const [classes, setClasses] = useState<ClassRow[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [deleteId, setDeleteId] = useState<string | null>(null)

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

  const confirmDelete = async () => {
    if (!deleteId) return;
    await classesApi.remove(deleteId)
    await loadClasses()
    setDeleteId(null)
  }

  const togglePublish = async (id: string) => {
    const current = classes.find((item) => item.id === id)
    if (!current) return
    const nextStatus = current.status === "published" ? "draft" : "published"

    if (nextStatus === "published") {
      const activeBatches = current.raw.batches?.filter(b => b.status === "active" || b.status === "upcoming")
      if (!activeBatches || activeBatches.length === 0) {
        toast.error("Cannot publish course", {
          description: "You need at least one active or upcoming batch configured.",
        })
        return
      }
    }
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
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 lg:py-10 space-y-6 sm:space-y-8 overflow-x-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-900 dark:text-white">Course Management</h1>
            <p className="text-sm sm:text-base text-gray-500 dark:text-gray-400 mt-1">
              Create new courses and manage your educational content.
            </p>
          </div>
          <Link href="/course-management/create">
            <Button className="gap-2 shadow-sm w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 text-white border-transparent">
              <Plus className="h-4 w-4" />
              Create Course
            </Button>
          </Link>
        </div>

        <Card className="shadow-sm border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900/50">
          <CardContent className="p-6 sm:p-8 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 dark:border-gray-800 pb-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Your Courses</h2>
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
                  className="group flex flex-col md:flex-row gap-5 rounded-xl border border-gray-200 bg-white hover:border-gray-300 dark:border-gray-800 dark:bg-gray-900/40 dark:hover:border-gray-700 p-5 transition-all duration-200 hover:shadow-sm"
                >
                  {/* Thumbnail Image */}
                  <div className="w-full md:w-56 h-40 md:h-auto shrink-0 overflow-hidden rounded-lg bg-gray-100 dark:bg-gray-800">
                    <img
                      src={item.imageUrl}
                      alt={item.title}
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  </div>

                  {/* Content Details */}
                  <div className="flex-1 flex flex-col justify-between py-1">
                    <div>
                      {/* Header row: Title & Badge */}
                      <div className="flex items-start justify-between gap-4 mb-2">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white line-clamp-1 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                          {item.title}
                        </h3>
                        <Badge
                          variant="secondary"
                          className={`shrink-0 border-0 px-2.5 py-0.5 text-xs font-medium ${item.status === "published"
                            ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400"
                            : "bg-amber-100 text-amber-700 hover:bg-amber-200 dark:bg-amber-500/10 dark:text-amber-400"
                            }`}
                        >
                          {item.status === "published" ? "Published" : "Draft"}
                        </Badge>
                      </div>

                      <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2 mb-4">
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

                  {/* Actions */}
                  <div className="grid grid-cols-2 md:grid-cols-1 gap-2 border-t md:border-t-0 md:border-l border-gray-100 dark:border-gray-800 pt-4 md:pt-0 md:pl-5 md:min-w-[140px]">
                    <Link href={`/course-management/create?edit=${item.id}`} className="w-full">
                      <Button variant="outline" size="sm" className="w-full justify-center md:justify-start gap-2 shadow-sm border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 text-xs md:text-sm">
                        <Edit2 className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate">Edit</span>
                      </Button>
                    </Link>
                    <Link href={`/course-management/${item.id}/assessments`} className="w-full">
                      <Button variant="outline" size="sm" className="w-full justify-center md:justify-start gap-2 shadow-sm border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 text-xs md:text-sm">
                        <CheckSquare className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate">Grade</span>
                      </Button>
                    </Link>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => togglePublish(item.id)}
                      className="w-full justify-center md:justify-start gap-2 shadow-sm border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 text-xs md:text-sm"
                    >
                      {item.status === "published" ? <EyeOff className="w-3.5 h-3.5 shrink-0" /> : <Eye className="w-3.5 h-3.5 shrink-0" />}
                      <span className="truncate">{item.status === "published" ? "Unpublish" : "Publish"}</span>
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setDeleteId(item.id)}
                      className="w-full justify-center md:justify-start gap-2 text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 text-xs md:text-sm"
                    >
                      <Trash2 className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">Delete</span>
                    </Button>
                  </div>
                </div>
              ))}

              {filteredClasses.length === 0 && (
                <div className="flex flex-col items-center justify-center text-center py-16 px-4">
                  <div className="bg-gray-100 dark:bg-gray-800 rounded-full p-4 mb-4">
                    <BookOpen className="h-8 w-8 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">No courses found</h3>
                  <p className="text-gray-500 dark:text-gray-400 max-w-sm mx-auto mb-6">
                    {searchQuery ? "We couldn't find any courses matching your search. Try a different term." : "You haven't created any courses yet. Start building your curriculum today."}
                  </p>
                  {!searchQuery && (
                    <Link href="/course-management/create">
                      <Button className="bg-indigo-600 hover:bg-indigo-700 text-white">
                        <Plus className="w-4 h-4 mr-2" /> Create Your First Course
                      </Button>
                    </Link>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the course and remove all associated data, including videos and student enrollments.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-red-600 hover:bg-red-700 text-white border-transparent">
              Delete Course
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </ProtectedRoute>
  )
}
