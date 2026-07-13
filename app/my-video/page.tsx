"use client"

import { useState, useMemo, useRef, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import {
  Search,
  Play,
  Clock,
  Filter,
  Grid3X3,
  List,
  Video,
  Upload,
  CheckCircle2,
  Loader2,
  Circle,
  ChevronDown,
  Calendar,
  TrendingUp,
  X,
  AlertCircle,
  MoreVertical,
  Edit,
  Trash2,
  ImagePlus,
  RefreshCw,
  BookOpen,
  Award,
} from "lucide-react"
import { motion, AnimatePresence } from "motion/react"
import { Video as VideoType, VideoStatus, ViewMode } from "@/lib/types/handle-videos"
import { videosApi } from "@/lib/api/handle-videos"
import api from "@/lib/api/axios"
import { getStorageUrl } from "@/lib/utils/storage-url"
import { useNotification } from "@/components/notification"

const statusConfig: Record<
  VideoStatus,
  { label: string; color: string; icon: React.ElementType }
> = {
  completed: {
    label: "Completed",
    color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
    icon: CheckCircle2,
  },
  processing: {
    label: "Processing",
    color: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
    icon: Loader2,
  },
  pending: {
    label: "Pending",
    color: "bg-gray-100 text-gray-600 dark:bg-gray-700/60 dark:text-gray-300",
    icon: Circle,
  },
  failed: {
    label: "Failed",
    color: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
    icon: AlertCircle,
  },
}

const STATUSES: { label: string; value: string }[] = [
  { label: "All Status", value: "all" },
  { label: "Completed", value: "completed" },
  { label: "Processing", value: "processing" },
  { label: "Pending", value: "pending" },
  { label: "Failed", value: "failed" },
]

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

function getCategoryId(category: VideoType["category"]): string {
  if (!category) return ""
  if (typeof category === "string") return category
  return category.id
}

function getCategoryName(category: VideoType["category"]): string {
  if (!category) return ""
  if (typeof category === "string") return category
  return category.name
}

export default function MyVideoPage() {
  const [videos, setVideos] = useState<VideoType[]>([])
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)

  const [searchQuery, setSearchQuery] = useState("")
  const [selectedStatus, setSelectedStatus] = useState("all")
  const [viewMode, setViewMode] = useState<ViewMode>("list")

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
  const [uploadingVideoData, setUploadingVideoData] = useState<VideoType | null>(null)
  const videoInputRef = useRef<HTMLInputElement>(null)
  const thumbnailInputRef = useRef<HTMLInputElement>(null)



  const [videoToDelete, setVideoToDelete] = useState<VideoType | null>(null)
  const [isDeleteModalVisible, setIsDeleteModalVisible] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const router = useRouter()
  const { aiProcessState, aiProcessingVideoId } = useNotification()

  const [blockedToast, setBlockedToast] = useState<{ videoId: string; message: string } | null>(null)
  const blockedToastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const fetchVideos = useCallback(async () => {
    setIsLoading(true)
    setFetchError(null)
    try {
      const [pageData, categoriesData] = await Promise.all([
        videosApi.getVideos(),
        api.get("/categories"),
      ])
      setVideos(Array.isArray(pageData) ? pageData : (pageData?.data || []))
      setCategories(categoriesData.data?.data || [])
    } catch {
      setFetchError("Failed to load data. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchVideos()
  }, [fetchVideos])

  useEffect(() => {
    const handleRefresh = () => {
      console.log('Berhasil refresh UI video di background (dari global listener)...');
      fetchVideos();
    };

    window.addEventListener('videoListRefresh', handleRefresh);
    return () => window.removeEventListener('videoListRefresh', handleRefresh);
  }, [fetchVideos]);

  useEffect(() => {
    const handleStatusChange = (e: Event) => {
      const { videoId, status } = (e as CustomEvent<{ videoId: string; status: string }>).detail;
      setVideos((prev) =>
        prev.map((v) =>
          String(v.id) === videoId ? { ...v, status: status as VideoStatus } : v
        )
      );
    };

    window.addEventListener('videoStatusChanged', handleStatusChange);
    return () => window.removeEventListener('videoStatusChanged', handleStatusChange);
  }, []);

  const hasUnfinishedVideos = useMemo(
    () => (videos || []).some((v) => v.status === "pending" || v.status === "processing"),
    [videos]
  )

  useEffect(() => {
    if (!hasUnfinishedVideos) return

    const interval = setInterval(async () => {
      try {
        const pageData = await videosApi.getVideos()
        setVideos(Array.isArray(pageData) ? pageData : (pageData?.data || []))
      } catch {

      }
    }, 10_000)

    return () => clearInterval(interval)
  }, [hasUnfinishedVideos]);

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

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }

  const handleThumbnailDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    const file = e.dataTransfer.files?.[0]
    if (file && file.type.startsWith("image/")) {
      if (file.size > 3 * 1024 * 1024) {
        setUploadError("Maksimal ukuran foto adalah 3MB.")
        return
      }
      setUploadError(null)
      setThumbnailFileInput(file)
    } else if (file) {
      setUploadError("Hanya file gambar yang diperbolehkan.")
    }
  }

  const handleVideoDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    const file = e.dataTransfer.files?.[0]
    if (file && file.type.startsWith("video/")) {
      if (file.size > 200 * 1024 * 1024) {
        setUploadError("Maksimal ukuran video adalah 200MB.")
        return
      }
      setUploadError(null)
      setVideoFileInput(file)
    } else if (file) {
      setUploadError("Hanya file video yang diperbolehkan.")
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

  const handleOpenChange = (open: boolean) => {
    setIsUploadOpen(open)
    if (!open) resetUploadForm()
  }

  const handleSubmit = async () => {
    const title = titleInput.trim()
    const description = descriptionInput.trim()
    const category = categoryInput.trim()
    const videoUrl = videoUrlInput.trim()

    if (!title) {
      setUploadError("Title is required.")
      return
    }
    if (!description) {
      setUploadError("Description is required.")
      return
    }
    if (!category) {
      setUploadError("Category is required.")
      return
    }
    if (!thumbnailFileInput) {
      setUploadError("Please select a thumbnail image.")
      return
    }
    if (sourceType === "file" && !videoFileInput) {
      setUploadError("Please select a video file.")
      return
    }
    if (sourceType === "url" && !videoUrl) {
      setUploadError("Please enter a video URL.")
      return
    }

    setIsUploading(true)
    setUploadProgress(0)
    setUploadError(null)

    const dummyVideo: VideoType = {
      id: "uploading-" + Date.now(),
      user_id: 0,
      title,
      description,
      category: categories.find((c) => String(c.id) === String(category)) || category,
      thumbnail_path: thumbnailFileInput ? URL.createObjectURL(thumbnailFileInput) : null,
      source_type: sourceType as "file" | "url",
      original_url: sourceType === "url" ? videoUrl : null,
      original_path: null,
      compressed_video_path: null,
      mp3_audio_path: null,
      status: "pending",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      require_grading: false,
      passing_score: null,
    }
    setUploadingVideoData(dummyVideo)
    handleOpenChange(false)

    try {
      await videosApi.uploadVideo({
        title,
        description,
        category_id: category,
        thumbnail_file: thumbnailFileInput,
        source_type: sourceType as "file" | "url",
        video_file: sourceType === "file" ? videoFileInput ?? undefined : undefined,
        video_url: sourceType === "url" ? videoUrl : undefined,
      }, (progressEvent) => {
        if (progressEvent.total) {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          setUploadProgress(percentCompleted);
        }
      })
      fetchVideos()
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        (err instanceof Error ? err.message : "Upload failed. Please try again.")
      setUploadError(msg)
      setIsUploadOpen(true)
    } finally {
      setIsUploading(false)
      setUploadingVideoData(null)
      setUploadProgress(null)
    }
  }



  const openDeleteModal = (video: VideoType) => {
    setVideoToDelete(video)
    setDeleteError(null)
    setIsDeleteModalVisible(true)
  }

  const handleDeleteSubmit = async () => {
    if (!videoToDelete) return

    setIsDeleting(true)
    setDeleteError(null)

    try {
      await videosApi.deleteVideo(videoToDelete.id)
      setIsDeleteModalVisible(false)
      fetchVideos()
    } catch (err: any) {
      const msg = err?.response?.data?.message || (err instanceof Error ? err.message : "Delete failed. Please try again.")
      setDeleteError(msg)
    } finally {
      setIsDeleting(false)
    }
  }

  const filteredList = useMemo(
    () =>
      videos.filter((v) => {
        const matchSearch = v.title.toLowerCase().includes(searchQuery.trim().toLowerCase())
        const matchStatus = selectedStatus === "all" || v.status === selectedStatus
        return matchSearch && matchStatus
      }),
    [videos, searchQuery, selectedStatus]
  )

  const stats = useMemo(() => ({
    total: videos.length,
    completed: videos.filter((v) => v.status === "completed").length,
    courses: 0,
    avgScore: "0%",
  }), [videos])

  const renderStatCard = ({
    icon: Icon,
    label,
    value,
    accent,
    iconColor,
  }: {
    icon: React.ElementType
    label: string
    value: string | number
    accent: string
    iconColor: string
  }) => (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-blue-100 bg-white p-5 sm:p-7 shadow-sm transition-colors hover:border-blue-200 dark:bg-gray-800 dark:border-gray-700"
    >
      <div className="flex items-center gap-3 sm:gap-4 overflow-hidden">
        <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center shrink-0 ${accent}`}>
          <Icon className={`w-5 h-5 sm:w-6 sm:h-6 ${iconColor}`} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white truncate">{value}</p>
          <p className="text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400 truncate">{label}</p>
        </div>
      </div>
    </motion.div>
  )

  const isVideoReady = (status: VideoStatus) => status === "completed"

  const isAiProcessingVideo = (videoId: string) => {
    return aiProcessingVideoId === videoId && (aiProcessState === "connecting" || aiProcessState === "generating")
  }

  const handleVideoClick = (video: VideoType) => {
    if (!isVideoReady(video.status)) {
      if (blockedToastTimer.current) clearTimeout(blockedToastTimer.current)
      const statusLabel = video.status === "processing" ? "sedang diproses" : video.status === "pending" ? "menunggu antrian" : "gagal diproses"
      setBlockedToast({ videoId: String(video.id), message: `Video ${statusLabel}. Harap tunggu hingga selesai.` })
      blockedToastTimer.current = setTimeout(() => setBlockedToast(null), 3500)
      return
    }

    if (isAiProcessingVideo(String(video.id))) {
      if (blockedToastTimer.current) clearTimeout(blockedToastTimer.current)
      setBlockedToast({ videoId: String(video.id), message: "AI sedang membuat kuis & soal. Harap tunggu sebentar..." })
      blockedToastTimer.current = setTimeout(() => setBlockedToast(null), 3500)
      return
    }

    router.push(`/my-video/${video.id}`)
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

  const renderVideoCard = (key: React.Key, video: VideoType, progress?: number | null) => {
    const cfg = statusConfig[video.status]
    const StatusIcon = cfg.icon
    const ready = isVideoReady(video.status) && !isAiProcessingVideo(String(video.id))

    if (viewMode === "list") {
      return (
        <div
          key={key}
          className={`rounded-xl border bg-white dark:bg-gray-800 dark:border-gray-700 relative group transition-all duration-200 ${ready ? "border-blue-100 hover:border-blue-200 hover:shadow-md cursor-pointer" : "border-gray-200 cursor-not-allowed opacity-90"
            }`}
          onClick={() => handleVideoClick(video)}
        >
          <div className="p-5 sm:p-6 flex flex-row items-start sm:items-center gap-4 sm:gap-6">
            {/* Thumbnail with processing overlay */}
            <div className="relative w-24 h-16 sm:w-44 sm:h-24 flex-shrink-0 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
              {video.thumbnail_path ? (
                <Image
                  src={getStorageUrl(video.thumbnail_path)}
                  alt={video.title}
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, 176px"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                  <Play className="w-5 h-5 text-gray-400 dark:text-gray-500 ml-0.5" />
                </div>
              )}
              {renderProcessingOverlay(video)}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white truncate mt-0 sm:mt-1">
                    {video.title}
                  </h3>
                  {video.description && (
                    <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-1 pr-2">
                      {video.description}
                    </p>
                  )}
                </div>
                {/* Always-visible action button safely placed */}
                <div className="shrink-0 z-10 sm:-mt-1">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                      <Button variant="ghost" size="icon" className="h-10 w-10 sm:h-12 sm:w-12 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors shrink-0">
                        <MoreVertical className="w-6 h-6 sm:w-8 sm:h-8" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent onClick={(e) => e.stopPropagation()} align="end" className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                      <DropdownMenuItem onClick={(e) => { e.stopPropagation(); router.push(`/videos/${video.id}/manage`); }} className="text-gray-900 dark:text-white cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 py-2">
                        <Edit className="w-5 h-5 mr-3" /> <span className="text-sm font-medium">Manage Video & Assessments</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={(e) => { e.stopPropagation(); openDeleteModal(video); }} className="text-red-600 dark:text-red-400 cursor-pointer hover:bg-red-50 dark:hover:bg-red-900/20 py-2">
                        <Trash2 className="w-5 h-5 mr-3" /> <span className="text-sm font-medium">Delete Video</span>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
              <div className="flex items-center gap-2 sm:gap-3 mt-1.5 sm:mt-2 flex-wrap">
                <Badge className={`text-[10px] sm:text-xs ${cfg.color} border-0 pointer-events-none px-1.5 py-0`}>
                  <StatusIcon className={`w-3 h-3 mr-1 ${video.status === "processing" ? "animate-spin" : ""}`} />
                  {cfg.label}
                </Badge>
                {video.category && (
                  <Badge variant="secondary" className="text-[10px] sm:text-xs text-white pointer-events-none px-1.5 py-0">
                    {getCategoryName(video.category)}
                  </Badge>
                )}
                <span className="text-[10px] sm:text-xs text-gray-400 dark:text-gray-500 flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {formatDate(video.created_at)}
                </span>
                {typeof progress === 'number' && (
                  <div className="flex items-center gap-1.5 w-24 sm:w-32 ml-1 sm:ml-2">
                    <Progress value={progress} className="h-1.5 sm:h-2 flex-1" />
                    <span className="text-[10px] sm:text-xs text-gray-500 font-medium">{Math.round(progress)}%</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )
    }

    return (
      <div
        key={key}
        className={`rounded-xl border bg-white dark:bg-gray-800 dark:border-gray-700 overflow-hidden relative group transition-all duration-200 ${ready ? "border-blue-100 hover:border-blue-200 hover:shadow-md cursor-pointer" : "border-gray-200 cursor-not-allowed opacity-90"
          }`}
        onClick={() => handleVideoClick(video)}
      >
        <div className="relative h-40 bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
          {video.thumbnail_path ? (
            <Image
              src={getStorageUrl(video.thumbnail_path)}
              alt={video.title}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            />
          ) : (
            <div className="w-12 h-12 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
              <Play className="w-6 h-6 text-gray-400 dark:text-gray-500 ml-0.5" />
            </div>
          )}
          {ready ? (
            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/20">
              <div className="relative w-12 h-12 rounded-full bg-gray-900/50 backdrop-blur flex items-center justify-center">
                <Play className="w-6 h-6 text-white ml-0.5" />
              </div>
            </div>
          ) : null}
          {renderProcessingOverlay(video)}
        </div>
        <div className="p-4">
          <div className="flex items-start justify-between gap-1">
            <div className="flex-1 min-w-0 pr-1">
              <h3 className="text-base font-bold text-gray-900 dark:text-white line-clamp-1">
                {video.title}
              </h3>
              <Badge className={`text-[10px] shrink-0 mt-1.5 ${cfg.color} border-0 w-fit inline-flex pointer-events-none`}>
                <StatusIcon className={`w-3 h-3 mr-0.5 ${video.status === "processing" ? "animate-spin" : ""}`} />
                {cfg.label}
              </Badge>
              {video.description && (
                <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 mt-2">
                  {video.description}
                </p>
              )}
            </div>
            {/* Always visible action button safely placed above date layout and flush right */}
            <div className="shrink-0 z-20 -mr-4 -mt-1">
              <DropdownMenu>
                <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                  <Button variant="ghost" size="icon" className="h-10 w-10 sm:h-12 sm:w-12 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors">
                    <MoreVertical className="w-6 h-6 sm:w-8 sm:h-8" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent onClick={(e) => e.stopPropagation()} align="end" className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); router.push(`/videos/${video.id}/manage`); }} className="text-gray-900 dark:text-white cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 py-2">
                    <Edit className="w-5 h-5 mr-3" /> <span className="text-sm font-medium">Manage Video & Assessments</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); openDeleteModal(video); }} className="text-red-600 dark:text-red-400 cursor-pointer hover:bg-red-50 dark:hover:bg-red-900/20 py-2">
                    <Trash2 className="w-5 h-5 mr-3" /> <span className="text-sm font-medium">Delete Video</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
          <div className="flex items-center justify-between text-[11px] text-gray-400 dark:text-gray-500 mt-2 pt-1 border-t border-gray-100 dark:border-gray-800">
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {formatDate(video.created_at)}
              </span>
              {typeof progress === 'number' && (
                <div className="flex items-center gap-1 w-20">
                  <div className="w-full bg-gray-200 rounded-full h-1.5 dark:bg-gray-700">
                    <div className="bg-blue-600 h-1.5 rounded-full transition-all duration-300" style={{ width: `${progress}%` }}></div>
                  </div>
                  <span className="text-[10px] font-medium text-gray-600 dark:text-gray-300">{progress}%</span>
                </div>
              )}
            </div>
            {video.category && (
              <Badge variant="secondary" className="text-[10px] text-white pointer-events-none">
                {getCategoryName(video.category)}
              </Badge>
            )}
          </div>
        </div>
      </div>
    )
  }

  const renderEmptyState = () => (
    <div className="text-center py-20">
      <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
        <Video className="w-8 h-8 text-gray-400 dark:text-gray-500" />
      </div>
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
        No videos found
      </h3>
      <p className="text-sm text-gray-500 dark:text-gray-400 max-w-sm mx-auto">
        {videos.length === 0
          ? "You haven't uploaded any videos yet. Click the button above to add your first video."
          : "No videos match your current filters. Try adjusting your search or filter criteria."}
      </p>
    </div>
  )

  return (
    <div className="p-6 sm:p-8 w-full max-w-[100vw] overflow-hidden">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">My Videos</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
            Manage and track all your uploaded video content
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={fetchVideos}
            disabled={isLoading}
            className="border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 bg-transparent text-xs sm:text-sm"
          >
            <RefreshCw className={`w-4 h-4 sm:mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </Button>
          <Dialog open={isUploadOpen} onOpenChange={handleOpenChange}>
            <DialogTrigger asChild>
              <Button className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800 text-xs sm:text-sm">
                <Upload className="w-4 h-4 sm:mr-2" />
                <span className="hidden sm:inline">Upload Video</span>
                <span className="sm:hidden">Upload</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-white dark:bg-gray-900 sm:max-w-[600px] max-h-[90vh] rounded-2xl border border-gray-100 dark:border-gray-800 shadow-xl overflow-hidden p-0">
              <DialogHeader className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50">
                <DialogTitle className="text-xl font-semibold text-gray-900 dark:text-white">Upload New Video</DialogTitle>
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
                    onDragOver={handleDragOver}
                    onDrop={handleThumbnailDrop}
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
                      onDragOver={handleDragOver}
                      onDrop={handleVideoDrop}
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
                            MP4, MKV, AVI, MOV, WEBM up to 200 MB
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
                  <Button type="button" variant="outline" onClick={() => handleOpenChange(false)} disabled={isUploading}>
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    onClick={handleSubmit}
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
        </div>



        {/* Delete Dialog */}
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
                <Button variant="destructive" onClick={handleDeleteSubmit} disabled={isDeleting} className="min-w-[90px] rounded-xl bg-red-600 hover:bg-red-700">
                  {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Delete"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
        {renderStatCard({ icon: Video, label: "Total Videos", value: stats.total, accent: "bg-blue-50 dark:bg-blue-900/40", iconColor: "text-blue-600 dark:text-blue-400" })}
        {renderStatCard({ icon: CheckCircle2, label: "Completed", value: stats.completed, accent: "bg-emerald-50 dark:bg-emerald-900/40", iconColor: "text-emerald-600 dark:text-emerald-400" })}
        {renderStatCard({ icon: BookOpen, label: "My Course", value: stats.courses, accent: "bg-purple-50 dark:bg-purple-900/40", iconColor: "text-purple-600 dark:text-purple-400" })}
        {renderStatCard({ icon: Award, label: "Avg. Score", value: stats.avgScore, accent: "bg-amber-50 dark:bg-amber-900/40", iconColor: "text-amber-600 dark:text-amber-400" })}
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        {/* Search */}
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500" />
          <Input
            placeholder="Search videos by title…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Status filter */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                className="border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 bg-transparent"
              >
                <Filter className="w-4 h-4 mr-2" />
                {STATUSES.find((s) => s.value === selectedStatus)?.label}
                <ChevronDown className="w-4 h-4 ml-2" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
              {STATUSES.map((s) => (
                <DropdownMenuItem
                  key={s.value}
                  onClick={() => setSelectedStatus(s.value)}
                  className="text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  {s.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* View toggle */}
          <div className="flex items-center border border-gray-300 dark:border-gray-600 rounded-lg p-1 bg-white dark:bg-gray-800">
            <Button
              variant={viewMode === "list" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("list")}
              className="h-8 px-3"
            >
              <List className="w-4 h-4" />
            </Button>
            <Button
              variant={viewMode === "grid" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("grid")}
              className="h-8 px-3"
            >
              <Grid3X3 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Results count */}
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
        Showing {filteredList.length} of {videos.length} video{videos.length !== 1 && "s"}
        {selectedStatus !== "all" && ` · ${STATUSES.find((s) => s.value === selectedStatus)?.label}`}
      </p>

      {/* Content */}
      <div className="min-h-[400px]">
        {isLoading ? (
          <div className="flex items-center justify-center py-20 gap-2 text-gray-400 dark:text-gray-500">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span className="text-sm">Loading videos…</span>
          </div>
        ) : fetchError ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-red-500">
            <AlertCircle className="w-8 h-8" />
            <p className="text-sm">{fetchError}</p>
            <Button variant="outline" size="sm" onClick={fetchVideos}>
              Retry
            </Button>
          </div>
        ) : filteredList.length === 0 ? (
          renderEmptyState()
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className={viewMode === "grid"
              ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
              : "flex flex-col gap-5"
            }
          >
            {uploadingVideoData && renderVideoCard("uploading", uploadingVideoData, uploadProgress)}
            {filteredList.map((v) => renderVideoCard(v.id, v))}
          </motion.div>
        )}
      </div>

      {/* Blocked navigation toast */}
      {blockedToast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-4 fade-in duration-300">
          <div className="flex items-center gap-3 px-4 sm:px-5 py-3 rounded-xl bg-white dark:bg-gray-900 text-gray-900 dark:text-white shadow-2xl backdrop-blur-sm border border-gray-200 dark:border-gray-700 max-w-[90vw]">
            <div className="w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-500/20 flex items-center justify-center shrink-0">
              <Loader2 className="w-4 h-4 text-amber-600 dark:text-amber-400 animate-spin" />
            </div>
            <p className="text-sm font-medium">{blockedToast.message}</p>
            <button
              onClick={() => setBlockedToast(null)}
              className="ml-2 text-gray-400 hover:text-gray-700 dark:hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
