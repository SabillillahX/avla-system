"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { ProtectedRoute } from "@/components/auth/ProtectedRoute"
import { classesApi, type CourseClass } from "@/lib/api/classes"
import { formatDateLabel, formatPrice, normalizeLevel, parsePrice } from "@/lib/class-utils"
import { Plus, Search } from "lucide-react"

type ClassRow = {
  id: string
  title: string
  category: string
  price: string
  level: string
  imageUrl: string
  description: string
  status: "published" | "draft" | "archived"
  students: number
  updatedAt: string
  raw: CourseClass
}

const mapClassRow = (course: CourseClass): ClassRow => {
  return {
    id: course.id,
    title: course.name,
    category: course.category?.name || "General",
    price: formatPrice(course.price),
    level: course.level || "Beginner",
    imageUrl:
      course.thumbnail_url ||
      "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?q=80&w=1200&auto=format&fit=crop",
    description: course.description || course.short_description || "No description yet.",
    status: (course.status as ClassRow["status"]) || "draft",
    students: 0,
    updatedAt: formatDateLabel(course.updated_at),
    raw: course,
  }
}

export default function ClassManagementPage() {
  const [classes, setClasses] = useState<ClassRow[]>([])
  const [searchQuery, setSearchQuery] = useState("")

  const loadClasses = async () => {
    const response = await classesApi.list()
    const rows = response.data.data.map(mapClassRow)
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
      price: parsePrice(current.price) ?? 0,
      level: normalizeLevel(current.level),
      is_free: current.raw.is_free,
      language: current.raw.language,
      has_certificate: current.raw.has_certificate,
    })
    await loadClasses()
  }

  return (
    <ProtectedRoute requireRole={["admin", "teacher"]}>
      <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">Class Management</h1>
          <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">
            Create new classes and manage everything in one place.
          </p>
        </div>

        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Manage Classes</h2>
          <Link href="/classes/create">
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Create Class
            </Button>
          </Link>
        </div>

        <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
          <CardContent className="p-4 sm:p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <h3 className="text-base font-semibold text-gray-900 dark:text-white">Class List</h3>
              <div className="relative w-full sm:w-56">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search class..."
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            <div className="space-y-4">
              {filteredClasses.map((item) => (
                <div
                  key={item.id}
                  className="flex flex-col md:flex-row gap-4 rounded-lg border border-gray-200 dark:border-gray-700 p-4"
                >
                  <div className="w-full md:w-40 h-24 overflow-hidden rounded-lg bg-gray-100 dark:bg-gray-700">
                    <img src={item.imageUrl} alt={item.title} className="h-full w-full object-cover" />
                  </div>
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                        {item.title}
                      </h3>
                      <Badge
                        className={
                          item.status === "published"
                            ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200"
                            : "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
                        }
                      >
                        {item.status === "published" ? "Published" : "Draft"}
                      </Badge>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2">
                      {item.description}
                    </p>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                      <span>{item.category}</span>
                      <span>•</span>
                      <span>{item.level}</span>
                      <span>•</span>
                      <span>{item.price}</span>
                      <span>•</span>
                      <span>{item.students} students</span>
                      <span>•</span>
                      <span>Updated {item.updatedAt}</span>
                    </div>
                  </div>
                  <div className="flex md:flex-col gap-2">
                    <Link href={`/classes/create?edit=${item.id}`}>
                      <Button variant="outline" size="sm">Edit</Button>
                    </Link>
                    <Button variant="outline" size="sm" onClick={() => togglePublish(item.id)}>
                      {item.status === "published" ? "Unpublish" : "Publish"}
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleDelete(item.id)}>
                      Delete
                    </Button>
                  </div>
                </div>
              ))}

              {filteredClasses.length === 0 && (
                <div className="text-center text-sm text-gray-500 dark:text-gray-400 py-10">
                  No classes found. Try creating a new class.
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </ProtectedRoute>
  )
}
