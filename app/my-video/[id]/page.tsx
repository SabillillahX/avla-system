"use client"

import { useEffect, useState, useRef, useCallback } from "react"
import { useRouter } from "next/navigation"
import { videosApi } from "@/lib/api/handle-videos"
import { Video as VideoType } from "@/lib/types/handle-videos"
import { getStorageUrl } from "@/lib/utils/storage-url"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { 
  ArrowLeft, 
  Play, 
  Pause, 
  RotateCcw, 
  RotateCw, 
  Volume2, 
  VolumeX, 
  Maximize, 
  Loader2, 
  AlertCircle,
  Calendar
} from "lucide-react"

function formatTime(seconds: number) {
  if (isNaN(seconds)) return "00:00"
  const date = new Date(seconds * 1000)
  const hh = date.getUTCHours()
  const mm = date.getUTCMinutes()
  const ss = date.getUTCSeconds().toString().padStart(2, '0')
  if (hh) {
    return `${hh}:${mm.toString().padStart(2, '0')}:${ss}`
  }
  return `${mm}:${ss}`
}

export default function VideoPreviewPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const [video, setVideo] = useState<VideoType | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Player State
  const videoRef = useRef<HTMLVideoElement>(null)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [progress, setProgress] = useState(0)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolume] = useState(1)
  const [isMuted, setIsMuted] = useState(false)
  const [showControls, setShowControls] = useState(true)
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null)

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

  // Custom Controls Hide/Show Logic
  const handleMouseMove = useCallback(() => {
    setShowControls(true)
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current)
    controlsTimeoutRef.current = setTimeout(() => {
      if (isPlaying) setShowControls(false)
    }, 2500)
  }, [isPlaying])

  useEffect(() => {
    if (!isPlaying) {
      setShowControls(true)
      if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current)
    } else {
      handleMouseMove()
    }
    return () => {
      if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current)
    }
  }, [isPlaying, handleMouseMove])

  // Player Handlers
  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause()
      } else {
        videoRef.current.play()
      }
      setIsPlaying(!isPlaying)
    }
  }

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime)
      setProgress((videoRef.current.currentTime / videoRef.current.duration) * 100)
    }
  }

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration)
    }
  }

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = (Number(e.target.value) / 100) * duration
    if (videoRef.current) {
      videoRef.current.currentTime = newTime
      setProgress(Number(e.target.value))
    }
  }

  const skipForward = () => {
    if (videoRef.current) {
      videoRef.current.currentTime = Math.min(videoRef.current.currentTime + 10, duration)
    }
  }

  const skipBackward = () => {
    if (videoRef.current) {
      videoRef.current.currentTime = Math.max(videoRef.current.currentTime - 10, 0)
    }
  }

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted
      setIsMuted(!isMuted)
    }
  }

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Number(e.target.value)
    setVolume(val)
    if (videoRef.current) {
      videoRef.current.volume = val
      if (val === 0) {
        setIsMuted(true)
        videoRef.current.muted = true
      } else if (isMuted) {
        setIsMuted(false)
        videoRef.current.muted = false
      }
    }
  }

  const toggleFullscreen = () => {
    if (!wrapperRef.current) return
    if (!document.fullscreenElement) {
      wrapperRef.current.requestFullscreen().catch(err => {
        console.error(`Error attempting to enable full-screen mode: ${err.message}`)
      })
    } else {
      document.exitFullscreen()
    }
  }

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
    <div className="p-4 md:p-6 lg:p-8 max-w-[1400px] mx-auto min-h-screen">
      <Button 
        variant="ghost" 
        onClick={() => router.back()} 
        className="mb-6 hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 transition-colors"
      >
        <ArrowLeft className="w-4 h-4 mr-2" /> Back to My Videos
      </Button>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        <div className="lg:col-span-3 space-y-6">
          {/* Player Wrapper */}
          <div 
            ref={wrapperRef}
            className="relative w-full aspect-video bg-black rounded-2xl overflow-hidden shadow-2xl group flex items-center justify-center"
            onMouseEnter={() => setShowControls(true)}
            onMouseLeave={() => { if (isPlaying) setShowControls(false) }}
            onMouseMove={handleMouseMove}
          >
            {videoSrc ? (
              <video
                ref={videoRef}
                src={videoSrc}
                className="w-full h-full object-contain cursor-pointer"
                onClick={togglePlay}
                onTimeUpdate={handleTimeUpdate}
                onLoadedMetadata={handleLoadedMetadata}
                onEnded={() => setIsPlaying(false)}
              />
            ) : (
              <div className="text-white text-sm">No video source available.</div>
            )}

            {/* Custom Controls Overlay */}
            <div 
              className={`absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/90 via-black/50 to-transparent transition-opacity duration-300 ${
                showControls ? "opacity-100" : "opacity-0 pointer-events-none"
              }`}
            >
              {/* Progress Bar */}
              <div className="flex items-center gap-3 mb-3">
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={progress}
                  onChange={handleSeek}
                  className="w-full h-1.5 bg-gray-600 rounded-lg appearance-none cursor-pointer accent-blue-500 hover:h-2 transition-all"
                />
              </div>

              {/* Bottom Controls */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  {/* Play/Pause */}
                  <button onClick={togglePlay} className="text-white hover:text-blue-400 transition-colors focus:outline-none">
                    {isPlaying ? <Pause className="w-6 h-6 fill-current" /> : <Play className="w-6 h-6 fill-current ml-1" />}
                  </button>

                  {/* Skip Buttons */}
                  <button onClick={skipBackward} className="text-white hover:text-blue-400 transition-colors focus:outline-none">
                    <RotateCcw className="w-5 h-5" />
                  </button>
                  <button onClick={skipForward} className="text-white hover:text-blue-400 transition-colors focus:outline-none">
                    <RotateCw className="w-5 h-5" />
                  </button>

                  {/* Volume */}
                  <div className="flex items-center gap-2 group/volume relative">
                    <button onClick={toggleMute} className="text-white hover:text-blue-400 transition-colors focus:outline-none">
                      {isMuted || volume === 0 ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                    </button>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.05"
                      value={isMuted ? 0 : volume}
                      onChange={handleVolumeChange}
                      className="w-0 sm:w-20 opacity-0 sm:opacity-100 group-hover/volume:w-20 group-hover/volume:opacity-100 h-1.5 bg-gray-600 rounded-lg appearance-none cursor-pointer accent-blue-500 transition-all duration-300"
                    />
                  </div>

                  {/* Time Display */}
                  <div className="text-white/90 text-sm font-medium tracking-wide">
                    {formatTime(currentTime)} <span className="text-white/50 mx-1">/</span> {formatTime(duration)}
                  </div>
                </div>

                {/* Right Controls */}
                <div className="flex items-center gap-4">
                  <button onClick={toggleFullscreen} className="text-white hover:text-blue-400 transition-colors focus:outline-none">
                    <Maximize className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          </div>

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

        {/* Sidebar Space for related videos or ads (Industry standard YouTube-like layout) */}
        <div className="lg:col-span-1 hidden lg:block space-y-4">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Up Next</h3>
          <div className="flex flex-col gap-4">
            {/* Placeholder items to demonstrate the layout structure */}
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex gap-3 animate-pulse">
                <div className="w-40 h-24 bg-gray-200 dark:bg-gray-700 rounded-lg flex-shrink-0"></div>
                <div className="flex-1 space-y-2 py-1">
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-2/3"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
