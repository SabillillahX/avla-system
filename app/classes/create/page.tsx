"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent } from "@/components/ui/card"
import { ProtectedRoute } from "@/components/auth/ProtectedRoute"
import { addClass, ClassItem, getClassById, updateClass } from "@/lib/class-storage"
import { ArrowLeft } from "lucide-react"

const emptyForm = {
  title: "",
  category: "",
  price: "",
  level: "",
  imageUrl: "",
  description: "",
}

export default function CreateClassPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const editId = searchParams.get("edit")
  const [formState, setFormState] = useState(emptyForm)
  const [isEditMode, setIsEditMode] = useState(false)

  useEffect(() => {
    if (!editId) {
      setIsEditMode(false)
      return
    }

    const classItem = getClassById(editId)
    if (!classItem) {
      setIsEditMode(false)
      return
    }

    setIsEditMode(true)
    setFormState({
      title: classItem.title,
      category: classItem.category,
      price: classItem.price,
      level: classItem.level,
      imageUrl: classItem.imageUrl,
      description: classItem.description,
    })
  }, [editId])

  const handleChange = (field: keyof typeof formState, value: string) => {
    setFormState((prev) => ({ ...prev, [field]: value }))
  }

  const resetForm = () => {
    setFormState(emptyForm)
  }

  const handleSubmit = () => {
    if (!formState.title.trim()) return

    if (isEditMode && editId) {
      updateClass(editId, {
        title: formState.title,
        category: formState.category || "General",
        price: formState.price || "Rp0",
        level: formState.level || "Beginner",
        imageUrl:
          formState.imageUrl ||
          "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?q=80&w=1200&auto=format&fit=crop",
        description: formState.description || "No description yet.",
        updatedAt: "May 22, 2026",
      })
    } else {
      const newItem: ClassItem = {
        id: `class-${Date.now()}`,
        title: formState.title,
        category: formState.category || "General",
        price: formState.price || "Rp0",
        level: formState.level || "Beginner",
        imageUrl:
          formState.imageUrl ||
          "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?q=80&w=1200&auto=format&fit=crop",
        description: formState.description || "No description yet.",
        status: "draft",
        students: 0,
        updatedAt: "May 22, 2026",
      }

      addClass(newItem)
    }
    resetForm()
    router.push("/classes")
  }

  return (
    <ProtectedRoute>
      <div className="p-6 space-y-6">
        <div className="flex items-start gap-3">
          <Link href="/classes">
            <Button variant="ghost" size="icon" aria-label="Back to class management">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              {isEditMode ? "Edit Class" : "Create Class"}
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              {isEditMode
                ? "Update the details of your class."
                : "Fill in the details to create a new class."}
            </p>
          </div>
        </div>

        <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
          <CardContent className="p-6 space-y-4">
            <div className="space-y-3">
              <Input
                placeholder="Class title"
                value={formState.title}
                onChange={(event) => handleChange("title", event.target.value)}
              />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Input
                  placeholder="Category"
                  value={formState.category}
                  onChange={(event) => handleChange("category", event.target.value)}
                />
                <Input
                  placeholder="Level (Beginner / Intermediate / Advanced)"
                  value={formState.level}
                  onChange={(event) => handleChange("level", event.target.value)}
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Input
                  placeholder="Price (Rp...)"
                  value={formState.price}
                  onChange={(event) => handleChange("price", event.target.value)}
                />
                <Input
                  placeholder="Thumbnail URL"
                  value={formState.imageUrl}
                  onChange={(event) => handleChange("imageUrl", event.target.value)}
                />
              </div>
              <Textarea
                placeholder="Short description"
                value={formState.description}
                onChange={(event) => handleChange("description", event.target.value)}
                rows={4}
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button onClick={handleSubmit}>{isEditMode ? "Save Changes" : "Create Class"}</Button>
              <Button variant="outline" onClick={resetForm}>Clear Form</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </ProtectedRoute>
  )
}
