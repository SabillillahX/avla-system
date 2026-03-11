"use client"

import { useState, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
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
  Plus,
  ImageIcon,
  Calendar,
  BarChart3,
  TrendingUp,
} from "lucide-react"

type VideoStatus = "completed" | "in-progress" | "not-started"
type ViewMode = "grid" | "list"

interface VideoItem {
  id: string
  title: string
  description: string
  thumbnailGradient: string
  duration: string
  uploadedAt: string
  status: VideoStatus
  category: string
  views: number
}

const DUMMY_VIDEOS: VideoItem[] = [
  {
    id: "v1",
    title: "Introduction to Machine Learning",
    description:
      "A comprehensive overview of ML fundamentals including supervised and unsupervised learning techniques.",
    thumbnailGradient: "from-violet-500 to-purple-600",
    duration: "12:34",
    uploadedAt: "2026-02-28",
    status: "completed",
    category: "Tutorial",
    views: 1240,
  },
  {
    id: "v2",
    title: "React Hooks Deep Dive",
    description:
      "Advanced patterns with useEffect, useCallback, and custom hooks for production-grade apps.",
    thumbnailGradient: "from-cyan-500 to-blue-600",
    duration: "24:15",
    uploadedAt: "2026-03-01",
    status: "completed",
    category: "Tutorial",
    views: 890,
  },
  {
    id: "v3",
    title: "Database Design Workshop",
    description:
      "Hands-on session covering normalization, indexing strategies, and query optimization.",
    thumbnailGradient: "from-amber-500 to-orange-600",
    duration: "45:02",
    uploadedAt: "2026-03-02",
    status: "in-progress",
    category: "Workshop",
    views: 432,
  },
  {
    id: "v4",
    title: "Cloud Architecture Lecture",
    description:
      "Exploring microservices, serverless patterns, and scalable infrastructure on AWS.",
    thumbnailGradient: "from-emerald-500 to-teal-600",
    duration: "38:50",
    uploadedAt: "2026-03-03",
    status: "in-progress",
    category: "Lecture",
    views: 675,
  },
  {
    id: "v5",
    title: "UI/UX Principles for Developers",
    description:
      "Learn design thinking, accessibility best practices, and modern layout systems.",
    thumbnailGradient: "from-pink-500 to-rose-600",
    duration: "18:22",
    uploadedAt: "2026-03-04",
    status: "not-started",
    category: "Tutorial",
    views: 210,
  },
  {
    id: "v6",
    title: "DevOps Pipeline Setup",
    description:
      "End-to-end CI/CD pipeline with GitHub Actions, Docker, and Kubernetes deployments.",
    thumbnailGradient: "from-slate-500 to-gray-700",
    duration: "52:10",
    uploadedAt: "2026-03-05",
    status: "not-started",
    category: "Workshop",
    views: 58,
  },
]

const CATEGORIES = ["All Categories", "Tutorial", "Lecture", "Workshop"]
const STATUSES: { label: string; value: string }[] = [
  { label: "All Status", value: "all" },
  { label: "Completed", value: "completed" },
  { label: "In Progress", value: "in-progress" },
  { label: "Not Started", value: "not-started" },
]

const statusConfig: Record<
  VideoStatus,
  { label: string; color: string; icon: React.ElementType }
> = {
  completed: {
    label: "Completed",
    color:
      "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
    icon: CheckCircle2,
  },
  "in-progress": {
    label: "In Progress",
    color:
      "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
    icon: Loader2,
  },
  "not-started": {
    label: "Not Started",
    color:
      "bg-gray-100 text-gray-600 dark:bg-gray-700/60 dark:text-gray-300",
    icon: Circle,
  },
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

export default function MyVideoPage() {
  const [videos] = useState<VideoItem[]>(DUMMY_VIDEOS)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("All Categories")
  const [selectedStatus, setSelectedStatus] = useState("all")
  const [viewMode, setViewMode] = useState<ViewMode>("list")
  const [isUploadOpen, setIsUploadOpen] = useState(false)
  const [newTitle, setNewTitle] = useState("")
  const [newDescription, setNewDescription] = useState("")
  const [newCategory, setNewCategory] = useState("Tutorial")

  // Filtered list
  const filtered = useMemo(() => {
    return videos.filter((v) => {
      const matchSearch =
        v.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        v.description.toLowerCase().includes(searchQuery.toLowerCase())
      const matchCategory =
        selectedCategory === "All Categories" ||
        v.category === selectedCategory
      const matchStatus =
        selectedStatus === "all" || v.status === selectedStatus
      return matchSearch && matchCategory && matchStatus
    })
  }, [videos, searchQuery, selectedCategory, selectedStatus])

  // Stats
  const stats = useMemo(() => {
    const total = videos.length
    const completed = videos.filter((v) => v.status === "completed").length
    const inProgress = videos.filter((v) => v.status === "in-progress").length
    const totalMinutes = videos.reduce((acc, v) => {
      const [m, s] = v.duration.split(":").map(Number)
      return acc + m + s / 60
    }, 0)
    return { total, completed, inProgress, totalMinutes: Math.round(totalMinutes) }
  }, [videos])

  const StatCard = ({
    icon: Icon,
    label,
    value,
    accent,
  }: {
    icon: React.ElementType
    label: string
    value: string | number
    accent: string
  }) => (
    <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
      <CardContent className="p-4 flex items-center gap-4">
        <div
          className={`w-10 h-10 rounded-lg flex items-center justify-center ${accent}`}
        >
          <Icon className="w-5 h-5 text-white" />
        </div>
        <div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            {value}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
        </div>
      </CardContent>
    </Card>
  )

  const VideoCard = ({ video }: { video: VideoItem }) => {
    const cfg = statusConfig[video.status]
    const StatusIcon = cfg.icon

    if (viewMode === "list") {
      return (
        <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow">
          <CardContent className="p-4 flex items-center gap-5">
            {/* Thumbnail */}
            <div
              className={`relative w-44 h-24 flex-shrink-0 rounded-lg bg-gradient-to-br ${video.thumbnailGradient} flex items-center justify-center`}
            >
              <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur flex items-center justify-center">
                <Play className="w-5 h-5 text-white ml-0.5" />
              </div>
              <span className="absolute bottom-1.5 right-2 text-[11px] font-medium text-white bg-black/50 rounded px-1.5 py-0.5">
                {video.duration}
              </span>
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <h3 className="text-base font-semibold text-gray-900 dark:text-white truncate">
                {video.title}
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 line-clamp-1">
                {video.description}
              </p>
              <div className="flex items-center gap-3 mt-2 flex-wrap">
                <Badge variant="secondary" className="text-xs">
                  {video.category}
                </Badge>
                <Badge className={`text-xs ${cfg.color} border-0`}>
                  <StatusIcon className="w-3 h-3 mr-1" />
                  {cfg.label}
                </Badge>
                <span className="text-xs text-gray-400 dark:text-gray-500 flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {formatDate(video.uploadedAt)}
                </span>
                <span className="text-xs text-gray-400 dark:text-gray-500 flex items-center gap-1">
                  <BarChart3 className="w-3 h-3" />
                  {video.views.toLocaleString()} views
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      )
    }

    // Grid card
    return (
      <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:shadow-lg transition-shadow group overflow-hidden">
        {/* Thumbnail */}
        <div
          className={`relative h-40 bg-gradient-to-br ${video.thumbnailGradient} flex items-center justify-center`}
        >
          <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            <Play className="w-6 h-6 text-white ml-0.5" />
          </div>
          <span className="absolute bottom-2 right-2 text-xs font-medium text-white bg-black/50 rounded px-2 py-0.5">
            {video.duration}
          </span>
        </div>

        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-2 mb-2">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white line-clamp-1">
              {video.title}
            </h3>
            <Badge className={`text-[10px] shrink-0 ${cfg.color} border-0`}>
              <StatusIcon className="w-3 h-3 mr-0.5" />
              {cfg.label}
            </Badge>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 mb-3">
            {video.description}
          </p>
          <div className="flex items-center justify-between text-[11px] text-gray-400 dark:text-gray-500">
            <span className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              {formatDate(video.uploadedAt)}
            </span>
            <Badge variant="secondary" className="text-[10px]">
              {video.category}
            </Badge>
          </div>
        </CardContent>
      </Card>
    )
  }

  const EmptyState = () => (
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
    <div className="p-6">
      {/* Header row */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            My Videos
          </h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
            Manage and track all your uploaded video content
          </p>
        </div>

        {/* Upload dialog */}
        <Dialog open={isUploadOpen} onOpenChange={setIsUploadOpen}>
          <DialogTrigger asChild>
            <Button className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800">
              <Upload className="w-4 h-4 mr-2" />
              Upload Video
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-white dark:bg-gray-800">
            <DialogHeader>
              <DialogTitle className="text-gray-900 dark:text-white">
                Upload New Video
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label className="text-gray-700 dark:text-gray-300">
                  Video Title
                </Label>
                <Input
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="Enter video title"
                  className="mt-1 bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white"
                />
              </div>
              <div>
                <Label className="text-gray-700 dark:text-gray-300">
                  Description
                </Label>
                <Textarea
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="Enter a brief description of your video…"
                  rows={3}
                  className="mt-1 bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white resize-none"
                />
              </div>
              <div>
                <Label className="text-gray-700 dark:text-gray-300">
                  Category
                </Label>
                <div className="flex gap-2 mt-2">
                  {CATEGORIES.filter((c) => c !== "All Categories").map(
                    (cat) => (
                      <Button
                        key={cat}
                        size="sm"
                        variant={newCategory === cat ? "default" : "outline"}
                        onClick={() => setNewCategory(cat)}
                        className="text-xs"
                      >
                        {cat}
                      </Button>
                    )
                  )}
                </div>
              </div>
              {/* Thumbnail upload */}
              <div>
                <Label className="text-gray-700 dark:text-gray-300">
                  Thumbnail
                </Label>
                <div className="mt-1 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-5 text-center cursor-pointer hover:border-blue-400 dark:hover:border-blue-500 transition-colors">
                  <ImageIcon className="w-6 h-6 mx-auto mb-1.5 text-gray-400" />
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Click to upload a thumbnail image
                  </p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                    PNG, JPG, WEBP up to 5MB
                  </p>
                </div>
              </div>
              {/* Video file upload */}
              <div>
                <Label className="text-gray-700 dark:text-gray-300">
                  Video File
                </Label>
                <div className="mt-1 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-8 text-center cursor-pointer hover:border-blue-400 dark:hover:border-blue-500 transition-colors">
                  <Upload className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Drag & drop your video file here, or click to browse
                  </p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                    MP4, MOV, AVI up to 500MB
                  </p>
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => setIsUploadOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => setIsUploadOpen(false)}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  Upload
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          icon={Video}
          label="Total Videos"
          value={stats.total}
          accent="bg-blue-600"
        />
        <StatCard
          icon={CheckCircle2}
          label="Completed"
          value={stats.completed}
          accent="bg-emerald-600"
        />
        <StatCard
          icon={TrendingUp}
          label="In Progress"
          value={stats.inProgress}
          accent="bg-amber-500"
        />
        <StatCard
          icon={Clock}
          label="Total Minutes"
          value={`${stats.totalMinutes} min`}
          accent="bg-violet-600"
        />
      </div>

      {/* Toolbar: search + filters + view toggle */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        {/* Search */}
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500" />
          <Input
            placeholder="Search videos by title or description…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Category filter */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                className="border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 bg-transparent"
              >
                <Filter className="w-4 h-4 mr-2" />
                {selectedCategory}
                <ChevronDown className="w-4 h-4 ml-2" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
              {CATEGORIES.map((cat) => (
                <DropdownMenuItem
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className="text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  {cat}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Status filter */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                className="border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 bg-transparent"
              >
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
        Showing {filtered.length} of {videos.length} video
        {videos.length !== 1 && "s"}
        {selectedCategory !== "All Categories" && ` in ${selectedCategory}`}
        {selectedStatus !== "all" &&
          ` · ${STATUSES.find((s) => s.value === selectedStatus)?.label}`}
      </p>

      {/* Content */}
      <div className="min-h-[400px]">
        {filtered.length === 0 ? (
          <EmptyState />
        ) : viewMode === "grid" ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((v) => (
              <VideoCard key={v.id} video={v} />
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((v) => (
              <VideoCard key={v.id} video={v} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
