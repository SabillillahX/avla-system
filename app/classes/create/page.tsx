"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { ProtectedRoute } from "@/components/auth/ProtectedRoute"
import { classesApi } from "@/lib/api/classes"
import { categoriesApi, type CategoryItem } from "@/lib/api/categories"
import { formatPrice, parsePrice, getImageUrl } from "@/lib/class-utils"
import { ArrowLeft, Plus, Trash2, UploadCloud } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"

interface FormState {
  title: string
  category: string
  price: string
  discount_price: string
  is_free: boolean
  short_description: string
  description: string
  language: string
  has_certificate: boolean
  what_you_will_learn: string[]
  requirements: string[]
}

const emptyForm: FormState = {
  title: "",
  category: "",
  price: "",
  discount_price: "",
  is_free: false,
  short_description: "",
  description: "",
  language: "",
  has_certificate: false,
  what_you_will_learn: [""],
  requirements: [""],
}

export default function CreateClassPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const editId = searchParams.get("edit")
  
  const [formState, setFormState] = useState<FormState>(emptyForm)
  const [isEditMode, setIsEditMode] = useState(false)
  const [categories, setCategories] = useState<CategoryItem[]>([])
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState("")

  useEffect(() => {
    const loadCategories = async () => {
      try {
        const response = await categoriesApi.list()
        setCategories(response.data)
      } catch (err) {
        console.error("Failed to load categories", err)
      }
    }
    loadCategories()
  }, [])

  useEffect(() => {
    if (!editId) {
      setIsEditMode(false)
      return
    }

    const loadClass = async () => {
      try {
        const response = await classesApi.get(editId)
        const classItem = response.data

        setIsEditMode(true)
        setFormState({
          title: classItem.name || "",
          category: classItem.category_id || classItem.category?.id || "",
          price: classItem.price ? formatPrice(classItem.price) : "",
          discount_price: classItem.discount_price ? formatPrice(classItem.discount_price) : "",
          is_free: classItem.is_free || false,
          short_description: classItem.short_description || "",
          description: classItem.description || "",
          language: classItem.language || "",
          has_certificate: classItem.has_certificate || false,
          what_you_will_learn: classItem.what_you_will_learn?.length ? classItem.what_you_will_learn : [""],
          requirements: classItem.requirements?.length ? classItem.requirements : [""],
        })
        if (classItem.thumbnail_url) {
          setPreviewUrl(getImageUrl(classItem.thumbnail_url) || "")
        }
      } catch (err) {
        console.error("Failed to load class", err)
        toast.error("Failed to load class details")
      }
    }
    loadClass()
  }, [editId])

  const handleChange = (field: keyof FormState, value: any) => {
    if (field === "price" || field === "discount_price") {
      const digits = String(value).replace(/[^0-9]/g, "")
      setFormState((prev) => ({ ...prev, [field]: digits ? formatPrice(digits) : "" }))
      return
    }
    setFormState((prev) => ({ ...prev, [field]: value }))
  }

  const handleArrayChange = (field: "what_you_will_learn" | "requirements", index: number, value: string) => {
    setFormState((prev) => {
      const newArray = [...prev[field]]
      newArray[index] = value
      return { ...prev, [field]: newArray }
    })
  }

  const addArrayItem = (field: "what_you_will_learn" | "requirements") => {
    setFormState((prev) => ({ ...prev, [field]: [...prev[field], ""] }))
  }

  const removeArrayItem = (field: "what_you_will_learn" | "requirements", index: number) => {
    setFormState((prev) => {
      const newArray = [...prev[field]]
      newArray.splice(index, 1)
      return { ...prev, [field]: newArray.length > 0 ? newArray : [""] }
    })
  }

  const resetForm = () => {
    setFormState(emptyForm)
    setThumbnailFile(null)
    setPreviewUrl("")
  }

  const handleSubmit = async () => {
    if (!formState.title.trim()) {
      toast.error("Validation Error", { description: "Class title is required." })
      return
    }

    const formData = new FormData()
    formData.append("name", formState.title)
    if (formState.description) formData.append("description", formState.description)
    if (formState.short_description) formData.append("short_description", formState.short_description)
    if (formState.language) formData.append("language", formState.language)
    
    // Explicitly append boolean values as expected by validation rules
    formData.append("is_free", formState.is_free ? "true" : "false")
    formData.append("has_certificate", formState.has_certificate ? "true" : "false")
    
    if (!formState.is_free) {
      if (formState.price) formData.append("price", String(parsePrice(formState.price) ?? 0))
      if (formState.discount_price) formData.append("discount_price", String(parsePrice(formState.discount_price) ?? 0))
    } else {
      formData.append("price", "0")
    }

    if (formState.category) {
      formData.append("category_id", formState.category)
    }
    
    const validLearnings = formState.what_you_will_learn.filter((v) => v.trim() !== "")
    validLearnings.forEach((item, index) => {
      formData.append(`what_you_will_learn[${index}]`, item)
    })
    
    const validRequirements = formState.requirements.filter((v) => v.trim() !== "")
    validRequirements.forEach((item, index) => {
      formData.append(`requirements[${index}]`, item)
    })

    if (thumbnailFile) {
      formData.append("thumbnail", thumbnailFile)
    }

    try {
      if (isEditMode && editId) {
        await classesApi.update(editId, formData)
        toast.success("Success", { description: "Class updated successfully!" })
      } else {
        formData.append("status", "draft")
        await classesApi.create(formData)
        toast.success("Success", { description: "Class created successfully!" })
      }
      resetForm()
      router.push("/classes")
    } catch (error: any) {
      if (error.response?.data?.errors) {
        const errorMessages = Object.values(error.response.data.errors).flat().join("\n")
        toast.error("Validation Error", { description: errorMessages })
      } else if (error.response?.data?.message) {
        toast.error("Error", { description: error.response.data.message })
      } else {
        toast.error("Unexpected Error", { description: error.message })
      }
    }
  }

  return (
    <ProtectedRoute requireRole={["admin", "teacher"]}>
      <div className="max-w-5xl mx-auto p-4 sm:p-6 lg:p-8 space-y-8">
        <div className="flex items-center gap-4 border-b border-gray-200 dark:border-gray-800 pb-6">
          <Link href="/classes">
            <Button variant="outline" size="icon" className="rounded-full shadow-sm hover:bg-gray-100 dark:hover:bg-gray-800">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
              {isEditMode ? "Edit Class Details" : "Create New Class"}
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {isEditMode
                ? "Update your existing class configuration."
                : "Design a comprehensive learning experience."}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            
            {/* Basic Information */}
            <Card className="shadow-sm border-gray-200 dark:border-gray-800">
              <CardHeader>
                <CardTitle className="text-lg">Basic Information</CardTitle>
                <CardDescription>Fundamental details about the course.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Course Title <span className="text-red-500">*</span></Label>
                  <Input
                    id="title"
                    placeholder="e.g. Master Modern Web Development"
                    value={formState.title}
                    onChange={(event) => handleChange("title", event.target.value)}
                  />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="category">Category</Label>
                    <Select value={formState.category} onValueChange={(value) => handleChange("category", value)}>
                      <SelectTrigger id="category">
                        <SelectValue placeholder="Select Category" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((cat) => (
                          <SelectItem key={cat.id} value={cat.id}>
                            {cat.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="language">Language</Label>
                    <Input
                      id="language"
                      placeholder="e.g. English, Indonesian"
                      value={formState.language}
                      onChange={(event) => handleChange("language", event.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="short_description">Short Description</Label>
                  <Textarea
                    id="short_description"
                    placeholder="A brief overview for the course card (max 500 chars)"
                    value={formState.short_description}
                    onChange={(event) => handleChange("short_description", event.target.value)}
                    rows={2}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Full Description</Label>
                  <Textarea
                    id="description"
                    placeholder="Comprehensive description of the course content"
                    value={formState.description}
                    onChange={(event) => handleChange("description", event.target.value)}
                    rows={5}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Course Content Planning */}
            <Card className="shadow-sm border-gray-200 dark:border-gray-800">
              <CardHeader>
                <CardTitle className="text-lg">Curriculum Outline</CardTitle>
                <CardDescription>Define objectives and prerequisites for students.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-8">
                {/* What You Will Learn */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-base font-semibold">What will students learn?</Label>
                  </div>
                  {formState.what_you_will_learn.map((item, index) => (
                    <div key={`learn-${index}`} className="flex items-center gap-2">
                      <Input
                        placeholder={`Learning objective ${index + 1}`}
                        value={item}
                        onChange={(e) => handleArrayChange("what_you_will_learn", index, e.target.value)}
                      />
                      <Button variant="ghost" size="icon" onClick={() => removeArrayItem("what_you_will_learn", index)} className="shrink-0 text-gray-500 hover:text-red-600">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  <Button variant="outline" size="sm" onClick={() => addArrayItem("what_you_will_learn")} className="mt-2 text-sm gap-2">
                    <Plus className="h-4 w-4" /> Add Objective
                  </Button>
                </div>

                {/* Requirements */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-base font-semibold">Requirements</Label>
                  </div>
                  {formState.requirements.map((item, index) => (
                    <div key={`req-${index}`} className="flex items-center gap-2">
                      <Input
                        placeholder={`Prerequisite or requirement ${index + 1}`}
                        value={item}
                        onChange={(e) => handleArrayChange("requirements", index, e.target.value)}
                      />
                      <Button variant="ghost" size="icon" onClick={() => removeArrayItem("requirements", index)} className="shrink-0 text-gray-500 hover:text-red-600">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  <Button variant="outline" size="sm" onClick={() => addArrayItem("requirements")} className="mt-2 text-sm gap-2">
                    <Plus className="h-4 w-4" /> Add Requirement
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            {/* Pricing Section */}
            <Card className="shadow-sm border-gray-200 dark:border-gray-800">
              <CardHeader>
                <CardTitle className="text-lg">Pricing</CardTitle>
                <CardDescription>Set the cost of your course.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="is_free">Free Course</Label>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Offer this course at no cost.</p>
                  </div>
                  <Switch
                    id="is_free"
                    checked={formState.is_free}
                    onCheckedChange={(checked) => handleChange("is_free", checked)}
                  />
                </div>

                {!formState.is_free && (
                  <div className="space-y-4 pt-2">
                    <div className="space-y-2">
                      <Label htmlFor="price">Regular Price (Rp)</Label>
                      <Input
                        id="price"
                        placeholder="Rp 0"
                        value={formState.price}
                        onChange={(event) => handleChange("price", event.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="discount_price">Discounted Price (Rp) <span className="text-xs text-gray-400 font-normal">(Optional)</span></Label>
                      <Input
                        id="discount_price"
                        placeholder="Rp 0"
                        value={formState.discount_price}
                        onChange={(event) => handleChange("discount_price", event.target.value)}
                      />
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Media Section */}
            <Card className="shadow-sm border-gray-200 dark:border-gray-800">
              <CardHeader>
                <CardTitle className="text-lg">Media & Assets</CardTitle>
                <CardDescription>Visuals to attract students.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Course Thumbnail</Label>
                  <div 
                    className="border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg p-6 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors relative overflow-hidden group"
                    onClick={() => document.getElementById("thumbnail-upload")?.click()}
                  >
                    {previewUrl ? (
                      <>
                        <img src={previewUrl} alt="Preview" className="absolute inset-0 w-full h-full object-cover z-0" />
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity z-10 flex items-center justify-center">
                          <span className="text-white font-medium">Change Image</span>
                        </div>
                      </>
                    ) : (
                      <>
                        <UploadCloud className="h-8 w-8 text-gray-400 mb-2" />
                        <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Click to upload thumbnail</p>
                        <p className="text-xs text-gray-500 mt-1">Recommended size: 1280x720px</p>
                      </>
                    )}
                    <Input
                      id="thumbnail-upload"
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0]
                        if (file) {
                          setThumbnailFile(file)
                          setPreviewUrl(URL.createObjectURL(file))
                        }
                      }}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Settings Section */}
            <Card className="shadow-sm border-gray-200 dark:border-gray-800">
              <CardHeader>
                <CardTitle className="text-lg">Settings</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="has_certificate">Certificate</Label>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Award upon completion.</p>
                  </div>
                  <Switch
                    id="has_certificate"
                    checked={formState.has_certificate}
                    onCheckedChange={(checked) => handleChange("has_certificate", checked)}
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Form Actions */}
        <div className="flex items-center justify-end gap-3 pt-6 border-t border-gray-200 dark:border-gray-800">
          <Button variant="outline" onClick={resetForm}>Discard Changes</Button>
          <Button onClick={handleSubmit} size="lg" className="px-8">{isEditMode ? "Save Details" : "Create Class"}</Button>
        </div>
      </div>
    </ProtectedRoute>
  )
}
