"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { Button } from "@/components/ui/button"
import type { Quiz, QuizResultResponse } from "@/lib/types/quiz"
import { Loader2 } from "lucide-react"
import videojs from "video.js"
import Player from "video.js/dist/types/player"
import "video.js/dist/video-js.css"
import "videojs-youtube"

type AdaptiveVideoPlayerProps = {
  videoId: string
  videoSrc: string
  apiBaseUrl?: string
  accessToken?: string
  batchId?: string
  className?: string
}

const defaultHeaders = (accessToken?: string): Record<string, string> => {
  const headers: Record<string, string> = {
    Accept: "application/json",
  }

  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`
  }

  return headers
}

export default function AdaptiveVideoPlayer({
  videoId,
  videoSrc,
  apiBaseUrl = "",
  accessToken,
  batchId,
  className,
}: AdaptiveVideoPlayerProps) {
  const videoContainerRef = useRef<HTMLDivElement>(null)
  const playerRef = useRef<Player | null>(null)
  const [playerEl, setPlayerEl] = useState<HTMLElement | null>(null)
  const shownQuizIdsRef = useRef<Set<string>>(new Set())

  const [quizzes, setQuizzes] = useState<Quiz[]>([])
  const [quizzesLoading, setQuizzesLoading] = useState(true)
  const [quizzesError, setQuizzesError] = useState<string | null>(null)

  const [isQuizOpen, setIsQuizOpen] = useState(false)
  const [activeQuizId, setActiveQuizId] = useState<string | null>(null)
  const [selectedOption, setSelectedOption] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [isMobile, setIsMobile] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    const checkMobile = () => setIsMobile(window.innerWidth < 768)
    checkMobile()
    window.addEventListener("resize", checkMobile)
    return () => window.removeEventListener("resize", checkMobile)
  }, [])

  const activeQuiz = useMemo(
    () => quizzes.find((quiz) => quiz.id === activeQuizId) || null,
    [activeQuizId, quizzes]
  )

  const resetQuizState = useCallback(() => {
    setSelectedOption(null)
    setIsSubmitting(false)
    setSubmitError(null)
  }, [])

  useEffect(() => {
    let isMounted = true
    const controller = new AbortController()

    const fetchQuizzes = async () => {
      const batchQuery = batchId ? `&batch_id=${batchId}` : "";
      try {
        setQuizzesLoading(true)
        setQuizzesError(null)
        setIsQuizOpen(false)
        setActiveQuizId(null)
        resetQuizState()
        const [quizzesRes, resultsRes] = await Promise.all([
          fetch(
            `${apiBaseUrl}/videos/${videoId}/quizzes`,
            {
              method: "GET",
              headers: defaultHeaders(accessToken),
              credentials: accessToken ? "omit" : "include",
              signal: controller.signal,
            }
          ),
          fetch(
            `${apiBaseUrl}/quiz-results?per_page=50&video_id=${videoId}${batchQuery}`,
            {
              method: "GET",
              headers: defaultHeaders(accessToken),
              credentials: accessToken ? "omit" : "include",
              signal: controller.signal,
            }
          )
        ])

        if (!quizzesRes.ok) {
          throw new Error("Gagal mengambil data kuis")
        }

        const quizzesPayload = (await quizzesRes.json()) as { data: Quiz[] }

        const answeredIds = new Set<string>()
        if (resultsRes.ok) {
          const resultsPayload = await resultsRes.json()
          if (resultsPayload.data && Array.isArray(resultsPayload.data)) {
            resultsPayload.data.forEach((r: any) => {
              if (r.quiz_id) answeredIds.add(String(r.quiz_id))
              else if (r.quiz && r.quiz.id) answeredIds.add(String(r.quiz.id))
            })
          }
        }

        shownQuizIdsRef.current = answeredIds

        const sorted = [...quizzesPayload.data].sort(
          (a, b) => a.trigger_time - b.trigger_time
        )
        if (isMounted) setQuizzes(sorted)
      } catch (error) {
        if (isMounted) {
          setQuizzesError(
            error instanceof Error ? error.message : "Gagal mengambil data kuis"
          )
        }
      } finally {
        if (isMounted) setQuizzesLoading(false)
      }
    }

    fetchQuizzes()

    return () => {
      isMounted = false
      controller.abort()
    }
  }, [accessToken, apiBaseUrl, resetQuizState, videoId])

  // Auto-reload quizzes when AI generation completes for this video
  useEffect(() => {
    const handleAiReady = (e: Event) => {
      const { videoId: readyVideoId, type } = (e as CustomEvent<{ videoId: string; type: string }>).detail
      if (readyVideoId === videoId && type === "quiz_generation_completed") {
        console.log(`[VideoPlayer] AI quiz ready for video ${videoId}, reloading quizzes...`)
        // Re-fetch quizzes
        setQuizzesLoading(true)
        fetch(`${apiBaseUrl}/videos/${videoId}/quizzes`, {
          method: "GET",
          headers: defaultHeaders(accessToken),
          credentials: accessToken ? "omit" : "include",
        })
          .then((res) => {
            if (!res.ok) throw new Error("Gagal mengambil data kuis")
            return res.json()
          })
          .then((payload: { data: Quiz[] }) => {
            const sorted = [...payload.data].sort((a, b) => a.trigger_time - b.trigger_time)
            setQuizzes(sorted)
            setQuizzesError(null)
          })
          .catch((err) => {
            setQuizzesError(err instanceof Error ? err.message : "Gagal mengambil data kuis")
          })
          .finally(() => setQuizzesLoading(false))
      }
    }

    window.addEventListener("aiContentReady", handleAiReady)
    return () => window.removeEventListener("aiContentReady", handleAiReady)
  }, [videoId, apiBaseUrl, accessToken])

  const isQuizOpenRef = useRef(isQuizOpen)
  useEffect(() => {
    isQuizOpenRef.current = isQuizOpen
  }, [isQuizOpen])

  const quizzesRef = useRef(quizzes)
  useEffect(() => {
    quizzesRef.current = quizzes
  }, [quizzes])

  useEffect(() => {
    if (!playerRef.current && videoContainerRef.current) {
      const videoElement = document.createElement("video-js")
      videoElement.classList.add("vjs-big-play-centered")
      videoContainerRef.current.appendChild(videoElement)

      const isYoutube = videoSrc.includes("youtube.com") || videoSrc.includes("youtu.be")
      const type = isYoutube ? "video/youtube" : videoSrc.includes(".m3u8") ? "application/x-mpegURL" : "video/mp4"

      const player = videojs(videoElement, {
        controls: true,
        fluid: true,
        techOrder: isYoutube ? ["youtube", "html5"] : ["html5"],
        sources: [{ src: videoSrc, type }]
      }, () => {
        setPlayerEl(player.el() as HTMLElement)

        player.on("loadedmetadata", () => {
          const savedTime = localStorage.getItem(`video-progress-${videoId}`)
          if (savedTime && parseFloat(savedTime) > 0) {
            player.currentTime(parseFloat(savedTime))
          }
        })

        player.on("fullscreenchange", () => {
          setIsFullscreen(player.isFullscreen() || false)
        })

        player.on("timeupdate", () => {
          const currentSecondFull = player.currentTime() || 0
          if (currentSecondFull > 0) {
            localStorage.setItem(`video-progress-${videoId}`, currentSecondFull.toString())
          }

          if (isQuizOpenRef.current || quizzesRef.current.length === 0) return

          const currentSecond = Math.floor(currentSecondFull)
          const nextQuiz = quizzesRef.current.find(
            (quiz) =>
              !shownQuizIdsRef.current.has(quiz.id) &&
              currentSecond >= quiz.trigger_time
          )

          if (!nextQuiz) return

          shownQuizIdsRef.current.add(nextQuiz.id)
          setActiveQuizId(nextQuiz.id)
          setIsQuizOpen(true)
          resetQuizState()
          player.pause()
        })

        player.on("play", () => {
          if (isQuizOpenRef.current) {
            player.pause()
          }
        })

        player.on("seeking", () => {
          if (isQuizOpenRef.current) {
            player.pause()
          }
        })
      })

      playerRef.current = player
    } else if (playerRef.current) {
      const isYoutube = videoSrc.includes("youtube.com") || videoSrc.includes("youtu.be")
      const type = isYoutube ? "video/youtube" : videoSrc.includes(".m3u8") ? "application/x-mpegURL" : "video/mp4"
      playerRef.current.src({ src: videoSrc, type })
    }
  }, [videoSrc, resetQuizState])

  useEffect(() => {
    return () => {
      if (playerRef.current && !playerRef.current.isDisposed()) {
        playerRef.current.dispose()
        playerRef.current = null
      }
    }
  }, [])

  const handleContinue = useCallback(() => {
    setIsQuizOpen(false)
    setActiveQuizId(null)
    resetQuizState()
    playerRef.current?.play()
  }, [resetQuizState])

  const handleSubmit = useCallback(async () => {
    if (!activeQuiz || !selectedOption) return

    // Save values for the fetch call because handleContinue resets state
    const quizId = activeQuiz.id
    const answer = selectedOption

    // Call synchronously to ensure the browser allows the video to play
    handleContinue()

    try {
      const response = await fetch(`${apiBaseUrl}/quiz-results`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...defaultHeaders(accessToken),
        },
        credentials: accessToken ? "omit" : "include",
        body: JSON.stringify({
          quiz_id: quizId,
          user_answer: answer,
          batch_id: batchId,
        }),
      })

      if (!response.ok) {
        console.error("Failed to submit answer:", response.statusText)
      }
    } catch (error) {
      console.error("Failed to submit answer:", error)
    }
  }, [accessToken, activeQuiz, apiBaseUrl, selectedOption, handleContinue])

  const isModalOutside = isMobile && !isFullscreen

  const quizOverlay = isQuizOpen && activeQuiz ? (
    <div className={`
      z-[200] flex items-center justify-center p-4 pointer-events-auto text-base
      ${isModalOutside ? "fixed inset-0 bg-black/80 backdrop-blur-md" : "absolute inset-0 bg-black/60 backdrop-blur-sm"}
    `}>
      <div className={`
        w-full shadow-2xl overflow-y-auto bg-white dark:bg-gray-900 border
        ${isModalOutside ? "max-w-[90vw] max-h-[85vh] rounded-2xl border-gray-200 dark:border-gray-700 p-4" : "max-w-xl max-h-full rounded-2xl border-gray-200/70 bg-white/95 dark:bg-gray-900/95 p-5"}
      `} onClick={(e) => e.stopPropagation()}>
        <div>
          <h2 className="text-base font-semibold text-gray-900 dark:text-white">
            {activeQuiz.question}
          </h2>
        </div>

        <div className="mt-5 grid gap-3">
          {activeQuiz.options.map((option, index) => {
            const isSelected = selectedOption === option
            const letter = String.fromCharCode(65 + index)

            return (
              <div
                key={option}
                role="button"
                tabIndex={0}
                onClick={() => setSelectedOption(option)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault()
                    setSelectedOption(option)
                  }
                }}
                className={`w-full rounded-xl border px-3 py-2.5 text-left text-sm transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500/60 ${isSelected
                  ? "border-blue-400 bg-blue-50 text-blue-900 dark:bg-blue-900/30 dark:text-blue-100"
                  : "border-gray-200 bg-white/80 text-gray-800 hover:border-blue-300 dark:border-gray-700 dark:bg-gray-900/60 dark:text-gray-200"
                  }`}
              >
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border border-current text-xs font-bold opacity-70">
                    {letter}
                  </span>
                  <span className="leading-snug">{option}</span>
                </div>
              </div>
            )
          })}
        </div>

        {submitError && (
          <p className="mt-4 text-xs text-red-500">{submitError}</p>
        )}

        <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {quizzesLoading
              ? "Memuat kuis..."
              : quizzesError
                ? quizzesError
                : `${shownQuizIdsRef.current.size} dari ${quizzes.length} kuis`}
          </span>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={!selectedOption || isSubmitting}
            className="h-9 px-5 border-0 !bg-slate-900 !text-slate-50 hover:!bg-slate-900/90 dark:!bg-slate-50 dark:!text-slate-900 dark:hover:!bg-slate-50/90 disabled:!opacity-50"
          >
            Continue Video
          </Button>
        </div>
      </div>
    </div>
  ) : null;

  const portalTarget = isModalOutside ? (mounted ? document.body : null) : playerEl

  return (
    <div className={className}>
      <div className="relative w-full rounded-2xl overflow-hidden shadow-2xl bg-black">
        <div ref={videoContainerRef} className="w-full" />
        {portalTarget && createPortal(quizOverlay, portalTarget)}
      </div>
    </div>
  )
}
