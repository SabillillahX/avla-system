"use client"

import { useEffect, useState, useRef, useCallback } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { ProtectedRoute } from "@/components/auth/ProtectedRoute"
import { classesApi, type CourseSection, type CourseClass, type PrerequisiteCourse } from "@/lib/api/classes"
import { categoriesApi, type CategoryItem } from "@/lib/api/categories"
import { formatPrice, parsePrice, getImageUrl } from "@/lib/class-utils"
import { ArrowLeft, Plus, Trash2, UploadCloud, Play } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import { Client } from "@modelcontextprotocol/sdk/client/index.js"
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js"

import { videosApi } from "@/lib/api/handle-videos"
import { Video as VideoType, VideoStatus } from "@/lib/types/handle-videos"
import { useNotification } from "@/components/notification"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { MoreVertical, Edit, Loader2, CheckCircle2, Circle, AlertCircle, Video, PlayCircle, Clock, ImagePlus, X, Upload, FileQuestion, ShieldAlert, Search, Link2 } from "lucide-react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { FormState } from "@/lib/types/course-management"

const statusConfig: Record<VideoStatus, { label: string; color: string; icon: React.ElementType }> = {
  completed: { label: "Completed", color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300", icon: CheckCircle2 },
  processing: { label: "Processing", color: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300", icon: Loader2 },
  pending: { label: "Pending", color: "bg-gray-100 text-gray-600 dark:bg-gray-700/60 dark:text-gray-300", icon: Circle },
  failed: { label: "Failed", color: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300", icon: AlertCircle },
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
  const [courseSections, setCourseSections] = useState<CourseSection[]>([])
  const [newSectionTitle, setNewSectionTitle] = useState("")
  const [editingSectionId, setEditingSectionId] = useState<string | null>(null)
  const [editingSectionTitle, setEditingSectionTitle] = useState("")
  // Video Management States
  const [activeSectionId, setActiveSectionId] = useState<string | null>(null)
  const [isGeneratingLO, setIsGeneratingLO] = useState(false)
  const [selectedPrerequisites, setSelectedPrerequisites] = useState<PrerequisiteCourse[]>([])
  const [allCourses, setAllCourses] = useState<CourseClass[]>([])
  const [prerequisiteSearch, setPrerequisiteSearch] = useState("")
  const [isPrereqOpen, setIsPrereqOpen] = useState(false)
  const [isUploadOpen, setIsUploadOpen] = useState(false)
  const [titleInput, setTitleInput] = useState("")
  const [descriptionInput, setDescriptionInput] = useState("")
  const [categoryInput, setCategoryInput] = useState("")
  const [thumbnailFileInput, setThumbnailFileInput] = useState<File | null>(null)
  const [sourceType, setSourceType] = useState<"file" | "url">("file")
  const [videoUrlInput, setVideoUrlInput] = useState("")
  const [videoFileInput, setVideoFileInput] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [uploadProgress, setUploadProgress] = useState<number | null>(null)
  const videoInputRef = useRef<HTMLInputElement>(null)
  const thumbnailInputRef = useRef<HTMLInputElement>(null)

  const [videoToEdit, setVideoToEdit] = useState<VideoType | null>(null)
  const [isEditModalVisible, setIsEditModalVisible] = useState(false)
  const [editTitleInput, setEditTitleInput] = useState("")
  const [editDescriptionInput, setEditDescriptionInput] = useState("")
  const [editCategoryInput, setEditCategoryInput] = useState("")
  const [editThumbnailFileInput, setEditThumbnailFileInput] = useState<File | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [editError, setEditError] = useState<string | null>(null)
  const editThumbnailInputRef = useRef<HTMLInputElement>(null)

  const [videoToDelete, setVideoToDelete] = useState<VideoType | null>(null)
  const [isDeleteModalVisible, setIsDeleteModalVisible] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const { aiProcessState, aiProcessingVideoId } = useNotification()

  // Block save/navigation while AI is running or has failed for any video in this class
  const isAiActive = aiProcessState === "connecting" || aiProcessState === "generating"
  const hasFailedVideos = courseSections.some((s) =>
    (s.videos || []).some((v: any) => v.status === "failed")
  )
  const isBlocked = isAiActive || hasFailedVideos

  // Warn on browser back/close while AI is running
  useEffect(() => {
    if (!isAiActive) return
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = ""
    }
    window.addEventListener("beforeunload", handleBeforeUnload)
    return () => window.removeEventListener("beforeunload", handleBeforeUnload)
  }, [isAiActive])

  useEffect(() => {
    const handleRefresh = () => {
      refreshSections();
    };
    window.addEventListener('videoListRefresh', handleRefresh);
    return () => window.removeEventListener('videoListRefresh', handleRefresh);
  }, [editId]);

  useEffect(() => {
    const handleStatusChange = (e: Event) => {
      refreshSections();
    };
    window.addEventListener('videoStatusChanged', handleStatusChange);
    return () => window.removeEventListener('videoStatusChanged', handleStatusChange);
  }, [editId]);

  const hasUnfinishedVideos = courseSections.some(s =>
    (s.videos || []).some((v: any) => v.status === "pending" || v.status === "processing")
  )

  useEffect(() => {
    if (!hasUnfinishedVideos) return
    const interval = setInterval(async () => {
      refreshSections()
    }, 10_000)
    return () => clearInterval(interval)
  }, [hasUnfinishedVideos, editId]);

  const refreshSections = async () => {
    if (!editId) return
    try {
      const response = await classesApi.get(editId)
      if (response.data.sections) setCourseSections(response.data.sections)
    } catch (err) { }
  }

  const handleThumbnailSelection = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setUploadError("Maksimal ukuran foto adalah 5MB.")
        if (thumbnailInputRef.current) thumbnailInputRef.current.value = ""
        return
      }
      setUploadError(null)
      setThumbnailFileInput(file)
    }
  }

  const handleVideoSelection = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (file.size > 200 * 1024 * 1024) {
        setUploadError("Maksimal ukuran video adalah 200MB.")
        if (videoInputRef.current) videoInputRef.current.value = ""
        return
      }
      setUploadError(null)
      setVideoFileInput(file)
    }
  }

  const handleEditThumbnailSelection = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setEditError("Maksimal ukuran foto adalah 5MB.")
        if (editThumbnailInputRef.current) editThumbnailInputRef.current.value = ""
        return
      }
      setEditError(null)
      setEditThumbnailFileInput(file)
    }
  }

  const isVideoReady = (status: VideoStatus) => status === "completed"

  const isAiProcessingVideo = (videoId: string) => {
    return aiProcessingVideoId === videoId && (aiProcessState === "connecting" || aiProcessState === "generating")
  }

  const renderProcessingOverlay = (video: VideoType) => {
    const aiProcessing = isVideoReady(video.status) && isAiProcessingVideo(String(video.id))
    if (isVideoReady(video.status) && !aiProcessing) return null

    const isProcessing = video.status === "processing" || aiProcessing
    const isPending = video.status === "pending"
    const isFailed = video.status === "failed"

    return (
      <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/40 backdrop-blur-[1px] rounded-lg transition-all">
        {/* {isProcessing && (
          <div className="relative">
            <Loader2 className="w-9 h-9 text-amber-400 animate-spin" />
            <div className="absolute inset-0 w-9 h-9 rounded-full border-2 border-amber-400/30 animate-ping" />
          </div>
        )}
        {isPending && (
          <Clock className="w-9 h-9 text-white/70" />
        )} */}
        {isFailed && (
          <AlertCircle className="w-9 h-9 text-red-400" />
        )}
      </div>
    )
  }

  const handleVideoUploadSubmit = async () => {
    if (!activeSectionId || !editId) return
    const title = titleInput.trim()
    const description = descriptionInput.trim()
    const videoUrl = videoUrlInput.trim()

    if (!title) return setUploadError("Title is required.")
    if (!description) return setUploadError("Description is required.")
    if (!thumbnailFileInput) return setUploadError("Please select a thumbnail.")
    if (sourceType === "file" && !videoFileInput) return setUploadError("Please select a video file.")
    if (sourceType === "url" && !videoUrl) return setUploadError("Please enter a video URL.")

    setIsUploading(true)
    setUploadProgress(0)
    setUploadError(null)

    try {
      await videosApi.uploadVideo({
        title,
        description,
        category_id: categoryInput || formState.category,
        course_id: editId,
        section_id: activeSectionId,
        thumbnail_file: thumbnailFileInput,
        source_type: sourceType,
        video_file: sourceType === "file" ? videoFileInput ?? undefined : undefined,
        video_url: sourceType === "url" ? videoUrl : undefined,
      }, (e) => {
        if (e.total) {
          setUploadProgress(Math.round((e.loaded * 100) / e.total))
        }
      })
      setIsUploadOpen(false)
      resetUploadForm()
      refreshSections()
      toast.success("Video uploaded successfully")
    } catch (err: any) {
      const msg = err?.response?.data?.message || (err instanceof Error ? err.message : "Upload failed")
      setUploadError(msg)
    } finally {
      setIsUploading(false)
      setUploadProgress(null)
    }
  }

  const resetUploadForm = () => {
    setTitleInput("")
    setDescriptionInput("")
    setCategoryInput("")
    setThumbnailFileInput(null)
    setSourceType("file")
    setVideoUrlInput("")
    setVideoFileInput(null)
    setUploadError(null)
    if (videoInputRef.current) videoInputRef.current.value = ""
    if (thumbnailInputRef.current) thumbnailInputRef.current.value = ""
  }

  const handleEditSubmit = async () => {
    if (!videoToEdit) return
    const title = editTitleInput.trim()
    if (!title) return setEditError("Title is required.")

    setIsEditing(true)
    setEditError(null)

    try {
      await videosApi.updateVideo(videoToEdit.id, {
        title,
        description: editDescriptionInput.trim() || undefined,
        thumbnail_file: editThumbnailFileInput ?? undefined,
      })
      setIsEditModalVisible(false)
      refreshSections()
      toast.success("Video updated")
    } catch (err: any) {
      const msg = err?.response?.data?.message || (err instanceof Error ? err.message : "Edit failed")
      setEditError(msg)
    } finally {
      setIsEditing(false)
    }
  }

  const handleDeleteVideoSubmit = async () => {
    if (!videoToDelete) return
    setIsDeleting(true)
    setDeleteError(null)
    try {
      await videosApi.deleteVideo(videoToDelete.id)
      setIsDeleteModalVisible(false)
      refreshSections()
      toast.success("Video deleted")
    } catch (err: any) {
      const msg = err?.response?.data?.message || (err instanceof Error ? err.message : "Delete failed")
      setDeleteError(msg)
    } finally {
      setIsDeleting(false)
    }
  }

  const openEditModal = (video: VideoType) => {
    setVideoToEdit(video)
    setEditTitleInput(video.title)
    setEditDescriptionInput(video.description || "")
    setEditCategoryInput(typeof video.category === "string" ? video.category : (video.category?.id || ""))
    setEditThumbnailFileInput(null)
    setEditError(null)
    if (editThumbnailInputRef.current) editThumbnailInputRef.current.value = ""
    setIsEditModalVisible(true)
  }

  const openDeleteModal = (video: VideoType) => {
    setVideoToDelete(video)
    setDeleteError(null)
    setIsDeleteModalVisible(true)
  }


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
    const loadAllCourses = async () => {
      try {
        const res = await classesApi.list({ per_page: 100 })
        const courseList = Array.isArray(res.data) ? res.data : (res.data?.data || [])
        setAllCourses(courseList)
      } catch (err) {
        console.error("Failed to load courses for prerequisites", err)
      }
    }
    loadAllCourses()
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
        if (classItem.sections) {
          setCourseSections(classItem.sections)
        }
        if (classItem.prerequisites?.length) {
          setSelectedPrerequisites(classItem.prerequisites)
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

  const handleAddSection = async () => {
    if (!newSectionTitle.trim() || !editId) return
    try {
      const res = await classesApi.createSection(editId, { title: newSectionTitle, is_published: true })
      if (res.data) {
        setCourseSections([...courseSections, res.data])
        setNewSectionTitle("")
        toast.success("Section added")
      }
    } catch (err) {
      toast.error("Failed to add section")
    }
  }

  const handleUpdateSection = async (sectionId: string) => {
    if (!editId || !editingSectionTitle.trim()) {
      setEditingSectionId(null)
      return
    }
    try {
      const res = await classesApi.updateSection(editId, sectionId, { title: editingSectionTitle.trim() })
      if (res.data) {
        setCourseSections(courseSections.map((s) => s.id === sectionId ? { ...s, title: editingSectionTitle.trim() } : s))
        setEditingSectionId(null)
        toast.success("Section updated successfully")
      }
    } catch (err) {
      toast.error("Failed to update section")
    }
  }

  const handleDeleteSection = async (sectionId: string) => {
    if (!editId) return
    try {
      await classesApi.deleteSection(editId, sectionId)
      setCourseSections(courseSections.filter((s) => s.id !== sectionId))
      toast.success("Section deleted")
    } catch (err) {
      toast.error("Failed to delete section")
    }
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

    selectedPrerequisites.forEach((prereq, index) => {
      formData.append(`prerequisites[${index}]`, prereq.id)
    })

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
      router.push("/course-management")
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

  const generateLOs = async (sectionId: string) => {
    const toastId = "generate-lo-toast";
    try {
      setIsGeneratingLO(true)
      toast.loading("Menghubungkan ke AI untuk membuat Learning Objectives...", { id: toastId })
      
      const token = localStorage.getItem("auth_token") || ""
      const mcpUrl = process.env.NEXT_PUBLIC_MCP_SERVER_URL
      if (!mcpUrl) throw new Error("MCP server URL not configured")

      const transport = new SSEClientTransport(new URL(`${mcpUrl}/sse`))
      const mcpClient = new Client({ name: "nextjs-client", version: "1.0.0" }, { capabilities: {} })
      await mcpClient.connect(transport)

      toast.loading("Menganalisis summary video di chapter terpilih...", { id: toastId })

      const result = await mcpClient.callTool({
        name: "generateChapterLearningObjectives",
        arguments: { token, sectionId },
      })

      const textResult = (result as any).content[0].text
      
      // Attempt to clean markdown backticks if any
      const cleanedText = textResult.replace(/^```json\s*/i, "").replace(/```$/i, "").trim()
      
      let parsed: any;
      try {
        parsed = JSON.parse(cleanedText)
      } catch (parseError) {
        // If it's not JSON, it might be an error string from the tool (e.g. no videos found)
        console.error("Failed to parse tool response as JSON:", textResult)
        toast.error(textResult.slice(0, 100) + (textResult.length > 100 ? "..." : ""), { id: toastId })
        mcpClient.close()
        setIsGeneratingLO(false)
        return
      }

      if (parsed.learning_objectives && Array.isArray(parsed.learning_objectives)) {
        setFormState((prev) => ({
          ...prev,
          what_you_will_learn: [
            ...prev.what_you_will_learn.filter((x) => x.trim() !== ""),
            ...parsed.learning_objectives,
          ],
        }))
        toast.success("Learning Objectives berhasil dibuat!", { id: toastId })
      } else {
        toast.error("Gagal mengekstrak learning objectives dari respons AI.", { id: toastId })
      }
      mcpClient.close()
    } catch (error: any) {
      console.error(error)
      toast.error(error.message || "Gagal membuat Learning Objectives.", { id: toastId })
    } finally {
      setIsGeneratingLO(false)
    }
  }

  return (
    <ProtectedRoute requireRole={["admin", "teacher"]}>
      <div className="max-w-7xl 2xl:max-w-[1600px] w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-8">
        <div className="flex items-center gap-4 border-b border-gray-200 dark:border-gray-800 pb-6">
          {isAiActive ? (
            <Button
              variant="outline"
              size="icon"
              className="rounded-full shadow-sm opacity-40 cursor-not-allowed"
              disabled
              title="Please wait for AI to finish before leaving"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
          ) : (
            <Link href="/course-management">
              <Button variant="outline" size="icon" className="rounded-full shadow-sm hover:bg-gray-100 dark:hover:bg-gray-800">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
          )}
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

        {/* AI / failed-video blocking banner */}
        {isBlocked && (
          <div className={`flex items-start gap-3 rounded-xl border px-4 py-3.5 text-sm ${isAiActive
              ? "bg-amber-50 border-amber-200 text-amber-800 dark:bg-amber-900/20 dark:border-amber-700 dark:text-amber-300"
              : "bg-red-50 border-red-200 text-red-700 dark:bg-red-900/20 dark:border-red-700 dark:text-red-300"
            }`}>
            {isAiActive ? (
              <Loader2 className="w-4 h-4 mt-0.5 shrink-0 animate-spin" />
            ) : (
              <ShieldAlert className="w-4 h-4 mt-0.5 shrink-0" />
            )}
            <div>
              <p className="font-semibold">
                {isAiActive ? "AI is still processing" : "Video processing failed"}
              </p>
              <p className="mt-0.5 text-xs opacity-80">
                {isAiActive
                  ? "Saving changes and leaving this page are disabled until the AI finishes generating quizzes and assessments. Please wait."
                  : "One or more videos have a failed status. Please delete the failed video and re-upload it before saving changes."}
              </p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 xl:grid-cols-4 gap-8">
          <div className="lg:col-span-2 xl:col-span-3 space-y-6">

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
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white" disabled={isGeneratingLO || courseSections.length === 0}>
                          {isGeneratingLO ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <PlayCircle className="w-4 h-4 mr-2" />}
                          Generate Learning Objective
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-56">
                        <div className="px-2 py-1.5 text-sm font-semibold text-muted-foreground">Select Chapter</div>
                        {courseSections.map((section) => (
                          <DropdownMenuItem key={section.id} onClick={() => generateLOs(section.id)}>
                            {section.title}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
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

                {/* Course Prerequisites */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-base font-semibold">Course Prerequisites</Label>
                      <p className="text-xs text-muted-foreground mt-0.5">Select existing courses that students should complete first.</p>
                    </div>
                  </div>

                  {selectedPrerequisites.length > 0 && (
                    <div className="space-y-2">
                      {selectedPrerequisites.map((prereq) => (
                        <div key={prereq.id} className="flex items-center gap-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 px-3 py-2.5 group transition-all hover:border-blue-300 dark:hover:border-blue-700">
                          <div className="flex items-center justify-center w-8 h-8 rounded-md bg-blue-100 dark:bg-blue-900/40 shrink-0">
                            <Link2 className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                          </div>
                          <span className="flex-1 text-sm font-medium truncate">{prereq.name}</span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-red-600"
                            onClick={() => setSelectedPrerequisites((prev) => prev.filter((p) => p.id !== prereq.id))}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}

                  <Popover open={isPrereqOpen} onOpenChange={setIsPrereqOpen}>
                    <PopoverTrigger asChild>
                      <Button size="sm" className="mt-1 text-sm gap-2 bg-blue-600 hover:bg-blue-700 text-white">
                        <Search className="h-4 w-4" />
                        Add Prerequisite Course
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-80 p-0" align="start">
                      <div className="p-2 border-b border-gray-200 dark:border-gray-700">
                        <Input
                          placeholder="Search courses..."
                          value={prerequisiteSearch}
                          onChange={(e) => setPrerequisiteSearch(e.target.value)}
                          className="h-8 text-sm"
                          autoFocus
                        />
                      </div>
                      <div className="max-h-56 overflow-y-auto p-1">
                        {allCourses
                          .filter((course) => {
                            if (editId && course.id === editId) return false
                            if (selectedPrerequisites.some((p) => p.id === course.id)) return false
                            if (prerequisiteSearch.trim()) {
                              return course.name.toLowerCase().includes(prerequisiteSearch.toLowerCase())
                            }
                            return true
                          })
                          .map((course) => (
                            <button
                              key={course.id}
                              className="flex items-center gap-2.5 w-full rounded-md px-2.5 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                              onClick={() => {
                                setSelectedPrerequisites((prev) => [
                                  ...prev,
                                  { id: course.id, name: course.name, thumbnail_url: course.thumbnail_url },
                                ])
                                setPrerequisiteSearch("")
                                setIsPrereqOpen(false)
                              }}
                            >
                              <div className="flex items-center justify-center w-7 h-7 rounded bg-gray-200 dark:bg-gray-700 shrink-0">
                                <Link2 className="w-3.5 h-3.5 text-gray-500 dark:text-gray-400" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-medium truncate">{course.name}</p>
                                <p className="text-xs text-muted-foreground truncate">
                                  {course.teacher?.name || "Unknown teacher"}
                                </p>
                              </div>
                            </button>
                          ))}
                        {allCourses.filter((course) => {
                          if (editId && course.id === editId) return false
                          if (selectedPrerequisites.some((p) => p.id === course.id)) return false
                          if (prerequisiteSearch.trim()) {
                            return course.name.toLowerCase().includes(prerequisiteSearch.toLowerCase())
                          }
                          return true
                        }).length === 0 && (
                          <p className="py-4 text-center text-sm text-muted-foreground">No courses available</p>
                        )}
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>
              </CardContent>
            </Card>

            {/* Section Curriculum */}
            <Card className="shadow-sm border-gray-200 dark:border-gray-800">
              <CardHeader>
                <CardTitle className="text-lg">Section Curriculum</CardTitle>
                <CardDescription>Organize your course into logical sections and manage videos.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {!isEditMode ? (
                  <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-6 text-center text-gray-500 text-sm">
                    Please create and save the class details first to unlock the curriculum builder.
                  </div>
                ) : (
                  <div className="space-y-6">
                    {courseSections.length > 0 ? (
                      <div className="space-y-4">
                        {courseSections.map((section, idx) => (
                          <div key={section.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-white dark:bg-gray-900">
                            <div className="flex items-center justify-between mb-3">
                              {editingSectionId === section.id ? (
                                <div className="flex items-center gap-2 flex-1 mr-4">
                                  <Input
                                    value={editingSectionTitle}
                                    onChange={(e) => setEditingSectionTitle(e.target.value)}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') handleUpdateSection(section.id)
                                      if (e.key === 'Escape') setEditingSectionId(null)
                                    }}
                                    autoFocus
                                    className="h-8 text-sm"
                                  />
                                  <Button size="sm" onClick={() => handleUpdateSection(section.id)} className="h-8">Save</Button>
                                  <Button size="sm" variant="ghost" onClick={() => setEditingSectionId(null)} className="h-8">Cancel</Button>
                                </div>
                              ) : (
                                <h4
                                  className="font-semibold text-gray-900 dark:text-white flex items-center gap-2 group cursor-pointer hover:text-blue-600 transition-colors"
                                  onClick={() => { setEditingSectionId(section.id); setEditingSectionTitle(section.title); }}
                                >
                                  <span className="flex items-center justify-center bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300 w-5 h-5 rounded-full text-xs shrink-0">{idx + 1}</span>
                                  {section.title}
                                  <Edit className="w-3.5 h-3.5 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity ml-1" />
                                </h4>
                              )}
                              {editingSectionId !== section.id && (
                                <Button variant="ghost" size="icon" onClick={() => handleDeleteSection(section.id)} className="h-8 w-8 text-gray-400 hover:text-red-600 shrink-0">
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                            {section.videos && section.videos.length > 0 ? (
                              <ul className="space-y-2 mt-3">
                                {section.videos.map((video: VideoType) => {
                                  const cfg = statusConfig[video.status] || statusConfig.pending
                                  const StatusIcon = cfg.icon
                                  return (
                                    <li key={video.id} className="text-sm flex items-center justify-between gap-3 bg-gray-50 dark:bg-gray-800 p-3 rounded border border-gray-100 dark:border-gray-700">
                                      <div className="flex items-center gap-3 overflow-hidden">
                                        <div className="w-12 h-8 bg-gray-200 dark:bg-gray-700 rounded flex items-center justify-center shrink-0 overflow-hidden relative">
                                          {video.thumbnail_path ? (
                                            <img src={getImageUrl(video.thumbnail_path) || ""} className="w-full h-full object-cover" />
                                          ) : (
                                            <Play className="w-4 h-4 text-gray-500" />
                                          )}
                                        </div>
                                        <div className="flex flex-col min-w-0">
                                          <span className="truncate font-medium text-gray-700 dark:text-gray-200">{video.title}</span>
                                          <div className="flex items-center gap-2 mt-0.5">
                                            <Badge className={`text-[10px] ${cfg.color} border-0 pointer-events-none px-1.5 py-0`}>
                                              <StatusIcon className={`w-3 h-3 mr-1 ${video.status === "processing" ? "animate-spin" : ""}`} />
                                              {cfg.label}
                                            </Badge>
                                          </div>
                                        </div>
                                      </div>
                                      <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                          <Button variant="ghost" size="icon" className="h-8 w-8">
                                            <MoreVertical className="w-4 h-4" />
                                          </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                          <DropdownMenuItem onClick={() => openEditModal(video)}>
                                            <Edit className="w-4 h-4 mr-2" /> Edit Video
                                          </DropdownMenuItem>
                                          {video.status === "completed" && (
                                            <DropdownMenuItem onClick={() => router.push(`/videos/${video.id}/ai-results`)}>
                                              <FileQuestion className="w-4 h-4 mr-2" /> View AI Results & Assessments
                                            </DropdownMenuItem>
                                          )}
                                          <DropdownMenuItem onClick={() => openDeleteModal(video)} className="text-red-600">
                                            <Trash2 className="w-4 h-4 mr-2" /> Delete Video
                                          </DropdownMenuItem>
                                        </DropdownMenuContent>
                                      </DropdownMenu>
                                    </li>
                                  )
                                })}
                              </ul>
                            ) : (
                              <p className="text-sm text-gray-500 italic mt-3">No videos in this section yet.</p>
                            )}
                            <Button
                              variant="outline"
                              size="sm"
                              className="mt-3 w-full border-dashed"
                              onClick={() => {
                                setActiveSectionId(section.id)
                                setIsUploadOpen(true)
                              }}
                            >
                              <UploadCloud className="w-4 h-4 mr-2" /> Add Video to Section
                            </Button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500 text-center py-4">No sections created yet.</p>
                    )}
                    <div className="flex gap-2 items-center border-t border-gray-100 dark:border-gray-800 pt-4">
                      <Input
                        value={newSectionTitle}
                        onChange={(e) => setNewSectionTitle(e.target.value)}
                        placeholder="e.g. Chapter 1: Introduction"
                        onKeyDown={(e) => e.key === 'Enter' && handleAddSection()}
                      />
                      <Button onClick={handleAddSection} className="shrink-0 gap-2">
                        <Plus className="h-4 w-4" /> Add Section
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6 lg:col-span-1">
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
          <Button variant="outline" onClick={resetForm} disabled={isAiActive}>Discard Changes</Button>
          <Button
            onClick={handleSubmit}
            size="lg"
            className="px-8"
            disabled={isBlocked}
          >
            {isAiActive
              ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Waiting for AI...</>
              : hasFailedVideos
                ? <><ShieldAlert className="w-4 h-4 mr-2" /> Fix Failed Videos First</>
                : (isEditMode ? "Save Changes" : "Create Class")
            }
          </Button>
        </div>

        {/* Video Management Modals */}
        <Dialog open={isUploadOpen} onOpenChange={(open) => { setIsUploadOpen(open); if (!open) resetUploadForm(); }}>
          <DialogContent className="bg-white dark:bg-gray-900 sm:max-w-[600px] max-h-[90vh] rounded-2xl border border-gray-100 dark:border-gray-800 shadow-xl overflow-hidden p-0">
            <DialogHeader className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50">
              <DialogTitle className="text-xl font-semibold text-gray-900 dark:text-white">Upload Video to Section</DialogTitle>
            </DialogHeader>

            <div className="space-y-5 px-6 py-4 max-h-[calc(90vh-140px)] overflow-y-auto">
              {/* Title */}
              <div className="space-y-1.5">
                <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">Video Title <span className="text-red-500">*</span></Label>
                <Input
                  value={titleInput}
                  onChange={(e) => setTitleInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && e.preventDefault()}
                  placeholder="Enter video title"
                  maxLength={255}
                  className="bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white rounded-xl focus-visible:ring-blue-500 focus-visible:border-blue-500 transition-all h-11"
                />
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">Description <span className="text-red-500">*</span></Label>
                <textarea
                  value={descriptionInput}
                  onChange={(e) => setDescriptionInput(e.target.value)}
                  placeholder="Enter video description"
                  maxLength={2000}
                  rows={4}
                  className="w-full rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all resize-none shadow-sm"
                />
                <p className="text-xs text-gray-400 dark:text-gray-500 text-right font-medium">{descriptionInput.length}/2000</p>
              </div>

              {/* Category */}
              <div className="space-y-1.5">
                <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">Category <span className="text-red-500">*</span></Label>
                <select
                  value={categoryInput}
                  onChange={(e) => setCategoryInput(e.target.value)}
                  className="w-full rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all shadow-sm h-11"
                >
                  <option value="" disabled>Select a category</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Thumbnail */}
              <div>
                <Label className="text-gray-700 dark:text-gray-300">Thumbnail <span className="text-red-500">*</span></Label>
                <div
                  onClick={() => thumbnailInputRef.current?.click()}
                  className="relative mt-1 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-4 text-center cursor-pointer hover:border-blue-400 dark:hover:border-blue-500 transition-colors"
                >
                  <input
                    type="file"
                    ref={thumbnailInputRef}
                    onChange={handleThumbnailSelection}
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                  />
                  {thumbnailFileInput ? (
                    <div className="flex flex-col items-center">
                      <CheckCircle2 className="w-6 h-6 mx-auto mb-1 text-emerald-500" />
                      <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400 break-all">
                        {thumbnailFileInput.name}
                      </p>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute top-2 right-2 h-6 w-6 text-gray-500 hover:text-red-500"
                        onClick={(e) => {
                          e.stopPropagation()
                          setThumbnailFileInput(null)
                          if (thumbnailInputRef.current) thumbnailInputRef.current.value = ""
                        }}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ) : (
                    <>
                      <ImagePlus className="w-6 h-6 mx-auto mb-1 text-gray-400" />
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Click to select a thumbnail image
                      </p>
                      <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                        JPG, PNG, WEBP up to 2 MB
                      </p>
                    </>
                  )}
                </div>
              </div>

              {/* Source type toggle */}
              <div>
                <Label className="text-gray-700 dark:text-gray-300">Source</Label>
                <div className="flex gap-2 mt-2">
                  {(["file", "url"] as const).map((type) => (
                    <Button
                      key={type}
                      type="button"
                      size="sm"
                      variant={sourceType === type ? "default" : "outline"}
                      onClick={() => setSourceType(type)}
                      className="capitalize text-xs"
                    >
                      {type === "file" ? "Upload File" : "Paste URL"}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Conditional input */}
              {sourceType === "file" ? (
                <div>
                  <Label className="text-gray-700 dark:text-gray-300">Video File</Label>
                  <div
                    onClick={() => videoInputRef.current?.click()}
                    className="relative mt-1 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-8 text-center cursor-pointer hover:border-blue-400 dark:hover:border-blue-500 transition-colors"
                  >
                    <input
                      type="file"
                      ref={videoInputRef}
                      onChange={handleVideoSelection}
                      accept="video/mp4,video/webm,video/avi,video/quicktime,video/x-matroska"
                      className="hidden"
                    />
                    {videoFileInput ? (
                      <div className="flex flex-col items-center">
                        <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-emerald-500" />
                        <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400 break-all">
                          {videoFileInput.name}
                        </p>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="absolute top-2 right-2 h-6 w-6 text-gray-500 hover:text-red-500"
                          onClick={(e) => {
                            e.stopPropagation()
                            setVideoFileInput(null)
                            if (videoInputRef.current) videoInputRef.current.value = ""
                          }}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ) : (
                      <>
                        <Upload className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          Drag &amp; drop your video file here, or click to browse
                        </p>
                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                          MP4, MKV, AVI, MOV, WEBM up to 500 MB
                        </p>
                      </>
                    )}
                  </div>
                </div>
              ) : (
                <div>
                  <Label className="text-gray-700 dark:text-gray-300">Video URL</Label>
                  <Input
                    value={videoUrlInput}
                    onChange={(e) => setVideoUrlInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && e.preventDefault()}
                    placeholder="https://example.com/video.mp4"
                    className="mt-1 bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white"
                  />
                </div>
              )}

              {/* Error */}
              {uploadError && (
                <p className="text-sm text-red-500 flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  {uploadError}
                </p>
              )}

              {/* Actions */}
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => { setIsUploadOpen(false); resetUploadForm(); }} disabled={isUploading}>
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={handleVideoUploadSubmit}
                  disabled={isUploading}
                  className="bg-blue-600 hover:bg-blue-700 min-w-[90px]"
                >
                  {isUploading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    "Upload"
                  )}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={isEditModalVisible} onOpenChange={setIsEditModalVisible}>
          <DialogContent className="bg-white dark:bg-gray-900 sm:max-w-[600px] max-h-[90vh] rounded-2xl border border-gray-100 dark:border-gray-800 shadow-xl overflow-hidden p-0">
            <DialogHeader className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50">
              <DialogTitle className="text-xl font-semibold text-gray-900 dark:text-white">Edit Video</DialogTitle>
            </DialogHeader>

            <div className="space-y-5 px-6 py-4 max-h-[calc(90vh-140px)] overflow-y-auto">
              <div className="space-y-1.5">
                <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">Video Title</Label>
                <Input
                  value={editTitleInput}
                  onChange={(e) => setEditTitleInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && e.preventDefault()}
                  placeholder="Enter video title"
                  className="bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white rounded-xl focus-visible:ring-blue-500 focus-visible:border-blue-500 transition-all h-11"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">Description</Label>
                <textarea
                  value={editDescriptionInput}
                  onChange={(e) => setEditDescriptionInput(e.target.value)}
                  placeholder="Optional description"
                  maxLength={2000}
                  rows={4}
                  className="w-full rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all resize-none shadow-sm"
                ></textarea>
              </div>

              <div className="space-y-1.5">
                <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">Category</Label>
                <select
                  value={editCategoryInput}
                  onChange={(e) => setEditCategoryInput(e.target.value)}
                  className="w-full rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all shadow-sm h-11"
                >
                  <option value="" disabled>
                    Select a category
                  </option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <Label className="text-gray-700 dark:text-gray-300">Update Thumbnail (Optional)</Label>
                <div
                  onClick={() => editThumbnailInputRef.current?.click()}
                  className="relative mt-1 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-4 text-center cursor-pointer hover:border-blue-400 dark:hover:border-blue-500 transition-colors"
                >
                  <input
                    type="file"
                    ref={editThumbnailInputRef}
                    onChange={handleEditThumbnailSelection}
                    accept="image/*"
                    className="hidden"
                  />
                  {editThumbnailFileInput ? (
                    <div className="flex flex-col items-center">
                      <CheckCircle2 className="w-6 h-6 mx-auto mb-1 text-emerald-500" />
                      <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400 break-all">
                        {editThumbnailFileInput.name}
                      </p>
                    </div>
                  ) : (
                    <>
                      <Upload className="w-5 h-5 mx-auto mb-1 text-gray-400" />
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Select a new thumbnail image
                      </p>
                    </>
                  )}
                </div>
              </div>

              {editError && (
                <p className="text-sm text-red-500 flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  {editError}
                </p>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setIsEditModalVisible(false)} disabled={isEditing}>
                  Cancel
                </Button>
                <Button type="button" onClick={handleEditSubmit} disabled={isEditing} className="bg-blue-600 hover:bg-blue-700 min-w-[90px]">
                  {isEditing ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save Changes"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={isDeleteModalVisible} onOpenChange={setIsDeleteModalVisible}>
          <DialogContent className="bg-white dark:bg-gray-900 sm:max-w-[450px] rounded-2xl border border-gray-100 dark:border-gray-800 shadow-xl overflow-hidden p-0">
            <DialogHeader className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 bg-red-50/50 dark:bg-red-900/10">
              <DialogTitle className="text-xl font-semibold text-red-600 dark:text-red-400">Delete Video</DialogTitle>
            </DialogHeader>

            <div className="space-y-4 px-6 py-5">
              <p className="text-gray-600 dark:text-gray-300">
                Are you sure you want to delete <span className="font-semibold">{videoToDelete?.title}</span>?
                This action cannot be undone.
              </p>

              {deleteError && (
                <p className="text-sm text-red-500 flex items-center gap-1.5 bg-red-50 dark:bg-red-900/20 p-3 rounded-lg">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  {deleteError}
                </p>
              )}

              <div className="flex justify-end gap-3 pt-2">
                <Button variant="outline" onClick={() => setIsDeleteModalVisible(false)} disabled={isDeleting} className="rounded-xl">
                  Cancel
                </Button>
                <Button variant="destructive" onClick={handleDeleteVideoSubmit} disabled={isDeleting} className="min-w-[90px] rounded-xl bg-red-600 hover:bg-red-700">
                  {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Delete"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </ProtectedRoute>
  )
}
