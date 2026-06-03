"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent } from "@/components/ui/card"
import { ProtectedRoute } from "@/components/auth/ProtectedRoute"
import { classesApi } from "@/lib/api/classes"
import { categoriesApi, type CategoryItem } from "@/lib/api/categories"
import { formatPrice, normalizeLevel, parsePrice } from "@/lib/class-utils"
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
  const [categories, setCategories] = useState<CategoryItem[]>([])

  useEffect(() => {
    const loadCategories = async () => {
      const response = await categoriesApi.list()
      setCategories(response.data)
    }

    loadCategories()
  }, [])

  useEffect(() => {
    if (!editId) {
      setIsEditMode(false)
      return
    }

    const loadClass = async () => {
      const response = await classesApi.get(editId)
      const classItem = response.data

      setIsEditMode(true)
      setFormState({
        title: classItem.name,
        category: classItem.category?.name || "",
        price: formatPrice(classItem.price),
        level: classItem.level || "",
        imageUrl: classItem.thumbnail_url || "",
        description: classItem.description || "",
      })
    }

    loadClass()
  }, [editId])

  const handleChange = (field: keyof typeof formState, value: string) => {
    setFormState((prev) => ({ ...prev, [field]: value }))
  }

  const resetForm = () => {
    setFormState(emptyForm)
  }

  const handleSubmit = async () => {
    if (!formState.title.trim()) return

    const matchedCategory = categories.find(
      (category) => category.name.toLowerCase() === formState.category.trim().toLowerCase()
    )

    if (isEditMode && editId) {
      await classesApi.update(editId, {
        name: formState.title,
        description: formState.description || "",
        short_description: formState.description || "",
        thumbnail_url: formState.imageUrl || null,
        price: parsePrice(formState.price) ?? 0,
        level: normalizeLevel(formState.level) || "beginner",
        category_id: matchedCategory?.id || null,
      })
    } else {
      await classesApi.create({
        name: formState.title,
        description: formState.description || "",
        short_description: formState.description || "",
        thumbnail_url: formState.imageUrl || null,
        price: parsePrice(formState.price) ?? 0,
        level: normalizeLevel(formState.level) || "beginner",
        status: "draft",
        category_id: matchedCategory?.id || null,
      })
    }
    resetForm()
    router.push("/classes")
  }

  return (
    <ProtectedRoute requireRole={["admin", "teacher"]}>
      <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
        <div className="flex items-start gap-3">
          <Link href="/classes">
            <Button variant="ghost" size="icon" aria-label="Back to class management">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
              {isEditMode ? "Edit Class" : "Create Class"}
            </h1>
            <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">
              {isEditMode
                ? "Update the details of your class."
                : "Fill in the details to create a new class."}
            </p>
          </div>
        </div>

        <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
          <CardContent className="p-4 sm:p-6 space-y-4">
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
