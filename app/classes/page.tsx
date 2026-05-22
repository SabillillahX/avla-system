"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { ProtectedRoute } from "@/components/auth/ProtectedRoute"
import { getStoredClasses, removeClass, updateClass, type ClassItem } from "@/lib/class-storage"
import { Plus, Search } from "lucide-react"

export default function ClassManagementPage() {
  const [classes, setClasses] = useState<ClassItem[]>([])
  const [searchQuery, setSearchQuery] = useState("")

  useEffect(() => {
    setClasses(getStoredClasses())
  }, [])

  const filteredClasses = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()
    if (!query) return classes
    return classes.filter((item) =>
      item.title.toLowerCase().includes(query) ||
      item.category.toLowerCase().includes(query)
    )
  }, [classes, searchQuery])

  const handleDelete = (id: string) => {
    const next = removeClass(id)
    setClasses(next)
  }

  const togglePublish = (id: string) => {
    const current = classes.find((item) => item.id === id)
    if (!current) return
    const next = updateClass(id, {
      status: current.status === "published" ? "draft" : "published",
      updatedAt: "May 22, 2026",
    })
    setClasses(next)
  }

  return (
    <ProtectedRoute>
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Class Management</h1>
          <p className="text-gray-600 dark:text-gray-400">
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
          <CardContent className="p-6 space-y-4">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-base font-semibold text-gray-900 dark:text-white">Class List</h3>
              <div className="relative w-56">
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
