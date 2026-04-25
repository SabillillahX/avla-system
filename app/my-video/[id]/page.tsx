"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { videosApi } from "@/lib/api/handle-videos"
import { Video as VideoType } from "@/lib/types/handle-videos"
import { getStorageUrl } from "@/lib/utils/storage-url"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import AdaptiveVideoPlayer from "@/components/AdaptiveVideoPlayer"
import { useAuth } from "@/contexts/AuthContext"
import { useNotification } from "@/components/notification"
import { 
  ArrowLeft, 
  Loader2, 
  AlertCircle,
  Calendar,
  Sparkles
} from "lucide-react"

export default function VideoPreviewPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const { token } = useAuth()
  const { aiProcessState, aiProcessingVideoId, aiProgress, aiStatusMessage } = useNotification()
  const [video, setVideo] = useState<VideoType | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Fetch Video Data
  useEffect(() => {
    const fetchVideo = async () => {
      try {
        const data = await videosApi.getVideoById(params.id)
        setVideo(data)
      } catch (err: any) {
        setError(err.message || "Failed to load video")
      } finally {
        setIsLoading(false)
      }
    }
    fetchVideo()
  }, [params.id])


  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3 text-gray-400 dark:text-gray-500">
        <Loader2 className="w-8 h-8 animate-spin" />
        <span>Loading video...</span>
      </div>
    )
  }

  if (error || !video) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3 text-red-500 p-6 text-center">
        <AlertCircle className="w-12 h-12" />
        <p className="text-lg font-semibold">{error || "Video not found"}</p>
        <Button variant="outline" onClick={() => router.back()} className="mt-4">
          <ArrowLeft className="w-4 h-4 mr-2" /> Go Back
        </Button>
      </div>
    )
  }

  const videoSrc = video.compressed_video_path 
    ? getStorageUrl(video.compressed_video_path)
    : video.original_path 
      ? getStorageUrl(video.original_path)
      : video.original_url || ""

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-[1600px] mx-auto min-h-screen">
      <Button 
        variant="ghost" 
        onClick={() => router.back()} 
        className="mb-6 hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 transition-colors"
      >
        <ArrowLeft className="w-4 h-4 mr-2" /> Back to My Videos
      </Button>

      {/* AI Processing Banner */}
      {aiProcessingVideoId === params.id && (aiProcessState === "connecting" || aiProcessState === "generating") && (
        <div className="mb-6 flex items-center gap-3 rounded-xl border border-amber-200 dark:border-amber-800/50 bg-amber-50 dark:bg-amber-900/20 px-5 py-3">
          <div className="relative shrink-0">
            <Sparkles className="w-5 h-5 text-amber-500" />
            <div className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-amber-400 rounded-full animate-ping" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
              AI sedang membuat kuis & soal penilaian...
            </p>
            <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5">
              {aiStatusMessage || `Progress: ${aiProgress}%`}
            </p>
          </div>
          <Loader2 className="w-4 h-4 text-amber-500 animate-spin shrink-0" />
        </div>
      )}

      <div className="grid grid-cols-1 gap-8">
        <div className="space-y-6">
          {/* Player Wrapper */}
          {videoSrc ? (
            <AdaptiveVideoPlayer
              videoId={video.id}
              videoSrc={videoSrc}
              apiBaseUrl={process.env.NEXT_PUBLIC_BACKEND_URL}
              accessToken={token ?? undefined}
            />
          ) : (
            <div className="flex items-center justify-center w-full aspect-video bg-black rounded-2xl shadow-2xl">
              <div className="text-white text-sm">No video source available.</div>
            </div>
          )}

          {/* Video Information */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
              {video.title}
            </h1>
            
            <div className="flex flex-wrap items-center gap-3 mb-6 pb-6 border-b border-gray-100 dark:border-gray-700">
              <span className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                <Calendar className="w-4 h-4 mr-1.5" />
                {new Date(video.created_at).toLocaleDateString("en-US", {
                  month: "long", day: "numeric", year: "numeric"
                })}
              </span>
              
              {video.category && (
                <Badge variant="secondary" className="px-3 py-1 font-medium bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 border-transparent transition-colors">
                  {video.category}
                </Badge>
              )}

              <Badge className={`px-3 py-1 font-medium capitalize ${
                video.status === 'completed' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400 hover:bg-emerald-200' :
                video.status === 'processing' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400 hover:bg-amber-200' :
                video.status === 'failed' ? 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400 hover:bg-red-200' :
                'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 hover:bg-gray-200'
              } border-transparent transition-colors`}>
                {video.status}
              </Badge>
            </div>

            <div>
              <h2 className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wider mb-2">Description</h2>
              <div className="text-gray-600 dark:text-gray-300 leading-relaxed whitespace-pre-wrap text-sm">
                {video.description ? video.description : <span className="italic text-gray-400">No description provided.</span>}
              </div>
            </div>
          </div>
        </div>

      </div>

      <div className="mt-8 flex justify-end">
        <Button 
          size="lg"
          onClick={() => router.push(`/my-video/${params.id}/assessment`)}
          className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-8 py-6 rounded-xl shadow-md transition-all hover:shadow-lg flex items-center gap-2"
        >
          <Sparkles className="w-5 h-5" />
          Mulai Penilaian
        </Button>
      </div>
    </div>
  )
}
