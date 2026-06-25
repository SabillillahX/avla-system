"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { ProtectedRoute } from "@/components/auth/ProtectedRoute"
import { useAuth } from "@/contexts/AuthContext"
import { classesApi, type CourseClass, type CourseSection } from "@/lib/api/classes"
import { formatDateLabel, formatPrice, getCourseDisplayPrice, getCourseOriginalPrice, getImageUrl } from "@/lib/class-utils"
import {
  Star, ArrowLeft, Users, BookOpen, Globe, Award, ChevronDown,
  ChevronUp, PlayCircle, CheckCircle, Loader2, Lock, Clock, X, Receipt, ShieldCheck
} from "lucide-react"
import { CheckoutModal } from "@/components/CheckoutModal"
import { cn } from "@/lib/utils"
import Script from "next/script"

const extractCourseArray = (value: unknown): CourseClass[] => {
  if (Array.isArray(value)) return value as CourseClass[]
  if (value && typeof value === "object" && "data" in value && Array.isArray((value as { data?: unknown }).data)) {
    return (value as { data: CourseClass[] }).data
  }
  return []
}

function SectionAccordion({ section, index, isEnrolled }: { section: CourseSection; index: number; isEnrolled: boolean }) {
  const [open, setOpen] = useState(index === 0)
  const videos: any[] = section.videos || []

  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="w-full flex items-center justify-between px-5 py-4 bg-gray-50 dark:bg-gray-800/60 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-left"
      >
        <div className="flex items-center gap-3">
          <span className="flex items-center justify-center bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 w-7 h-7 rounded-full text-xs font-bold shrink-0">
            {index + 1}
          </span>
          <span className="font-semibold text-gray-900 dark:text-white text-sm sm:text-base">{section.title}</span>
        </div>
        <div className="flex items-center gap-3 shrink-0 ml-4">
          <span className="text-xs text-gray-500 dark:text-gray-400 hidden sm:block">
            {videos.length} {videos.length === 1 ? "video" : "videos"}
          </span>
          {open ? (
            <ChevronUp className="w-4 h-4 text-gray-500" />
          ) : (
            <ChevronDown className="w-4 h-4 text-gray-500" />
          )}
        </div>
      </button>

      {open && (
        <ul className="divide-y divide-gray-100 dark:divide-gray-700/60">
          {videos.length === 0 ? (
            <li className="px-5 py-3 text-sm text-gray-400 dark:text-gray-500 italic">No videos in this section.</li>
          ) : (
            videos.map((video: any, vIdx: number) => (
              <li key={video.id || vIdx} className="flex items-center gap-3 px-5 py-3 bg-white dark:bg-gray-900">
                <div className="relative w-16 h-10 shrink-0 rounded-md overflow-hidden bg-gray-100 dark:bg-gray-800">
                  {video.thumbnail_path ? (
                    <img
                      src={getImageUrl(video.thumbnail_path) || ""}
                      alt={video.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <PlayCircle className="w-5 h-5 text-gray-400" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                    {isEnrolled ? (
                      <PlayCircle className="w-4 h-4 text-white" />
                    ) : (
                      <Lock className="w-3 h-3 text-white" />
                    )}
                  </div>
                </div>
                <span className="text-sm text-gray-700 dark:text-gray-300 flex-1 line-clamp-1">{video.title}</span>
                {video.duration && (
                  <span className="text-xs text-gray-400 shrink-0 flex items-center gap-1">
                    <Clock className="w-3 h-3" /> {video.duration}
                  </span>
                )}
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  )
}

function LoadingSkeleton() {
  return (
    <ProtectedRoute>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-6 animate-pulse">
        <div className="h-6 w-32 bg-gray-200 dark:bg-gray-700 rounded-lg" />
        <div className="h-10 w-3/4 bg-gray-200 dark:bg-gray-700 rounded-lg" />
        <div className="h-5 w-1/2 bg-gray-200 dark:bg-gray-700 rounded-lg" />
        <div className="h-56 w-full bg-gray-200 dark:bg-gray-700 rounded-2xl" />
      </div>
    </ProtectedRoute>
  )
}

export default function CourseDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const { user } = useAuth()
  const [course, setCourse] = useState<CourseClass | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [joined, setJoined] = useState(false)
  const [isCheckingEnrollment, setIsCheckingEnrollment] = useState(true)
  const [isJoining, setIsJoining] = useState(false)
  const [invoice, setInvoice] = useState<any>(null)
  const [showInvoice, setShowInvoice] = useState(false)
  const [isCanceling, setIsCanceling] = useState(false)

  const canEnroll = user?.roles?.includes("student")
  const isEnrolled = joined

  useEffect(() => {
    const loadCourse = async () => {
      try {
        const response = await classesApi.get(params.id)
        setCourse(response.data)
      } finally {
        setIsLoading(false)
      }
    }
    loadCourse()
  }, [params.id])

  useEffect(() => {
    const loadEnrolled = async () => {
      if (!user?.roles?.includes("student")) {
        setJoined(false)
        setIsCheckingEnrollment(false)
        return
      }
      setIsCheckingEnrollment(true)
      try {
        const token = typeof window !== "undefined" ? localStorage.getItem("auth_token") : null
        const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/courses/enrolled`, {
          headers: {
            Accept: "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        })
        const payload = await response.json()
        const enrolledIds = extractCourseArray(payload.data).map((item) => String(item.id))
        setJoined(enrolledIds.includes(String(params.id)))
      } catch {
        setJoined(false)
      } finally {
        setIsCheckingEnrollment(false)
      }
    }
    loadEnrolled()
  }, [params.id, user?.roles])

  const handleJoin = async () => {
    if (!course || joined || !canEnroll) return
    setIsJoining(true)
    try {
      if (course.is_free) {
        await classesApi.enroll(course.id)
        setJoined(true)
      } else {
        const token = localStorage.getItem("auth_token")
        const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/transactions/checkout`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Accept": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ course_id: course.id }),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || "Failed to generate invoice");
        
        if (data.invoice_details) {
          setInvoice(data.invoice_details);
          setShowInvoice(true);
        }
      }
    } catch (err: any) {
      console.error(err)
      alert(err.message || "Failed to initiate checkout")
    } finally {
      setIsJoining(false)
    }
  }

  const handlePayNow = () => {
    if (!invoice || !invoice.snap_token) return;
    
    // @ts-ignore
    window.snap.pay(invoice.snap_token, {
      onSuccess: function () {
        setJoined(true);
        setShowInvoice(false);
      },
      onPending: function () {
        setShowInvoice(false);
      },
      onError: function () {
        setShowInvoice(false);
      },
      onClose: function () {
        // User closed snap popup
      }
    });
  }

  const handleCancelOrder = async () => {
    if (!invoice) return;
    setIsCanceling(true)
    try {
        const token = localStorage.getItem("auth_token")
        const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/transactions/${invoice.transaction_id}/cancel`, {
            method: "POST",
            headers: {
                "Accept": "application/json",
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
            }
        });
        if (response.ok) {
            setShowInvoice(false);
            setInvoice(null);
        } else {
            const data = await response.json();
            alert(data.message || "Failed to cancel order");
        }
    } catch (err: any) {
        alert(err.message || "Failed to cancel order");
    } finally {
        setIsCanceling(false)
    }
  }

  if (isLoading) return <LoadingSkeleton />

  if (!course) {
    return (
      <ProtectedRoute>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-16 text-center">
          <BookOpen className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Course not found</h1>
          <p className="text-gray-500 dark:text-gray-400 mb-6">We could not find the course you are looking for.</p>
          <Link href="/courses">
            <Button variant="outline" className="gap-2">
              <ArrowLeft className="w-4 h-4" /> Back to Courses
            </Button>
          </Link>
        </div>
      </ProtectedRoute>
    )
  }

  const sections: CourseSection[] = course.sections || []
  const totalVideos = sections.reduce((sum, s) => sum + (s.videos?.length || 0), 0)
  const learnings = (course.what_you_will_learn || []).filter(Boolean)
  const requirements = (course.requirements || []).filter(Boolean)
  const thumbnailUrl =
    getImageUrl(course.thumbnail_url) ||
    "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?q=80&w=1200&auto=format&fit=crop"

  return (
    <ProtectedRoute>
      <Script src="https://app.sandbox.midtrans.com/snap/snap.js" data-client-key={process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY} strategy="lazyOnload" />
      <div className="min-h-screen bg-[#EFF6FF] dark:bg-gray-950">

        {/* Top nav bar */}
        <div className="sticky top-0 z-30 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border-b border-gray-200/80 dark:border-gray-800">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.back()}
              className="rounded-full h-9 w-9 shrink-0 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:text-blue-600"
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 min-w-0">
              <Link href="/courses" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors shrink-0">
                Courses
              </Link>
              <span>/</span>
              <span className="text-gray-900 dark:text-white font-medium truncate">{course.name}</span>
            </div>
          </div>
        </div>

        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
          <div className="flex flex-col lg:flex-row gap-8">

            {/* ── Left / Main content ── */}
            <div className="flex-1 min-w-0 space-y-8">

              {/* Hero info */}
              <div className="space-y-4">
                {course.category?.name && (
                  <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 border-0 font-medium">
                    {course.category.name}
                  </Badge>
                )}
                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 dark:text-white leading-tight">
                  {course.name}
                </h1>
                {(course.short_description || course.description) && (
                  <p className="text-base text-gray-600 dark:text-gray-400 leading-relaxed">
                    {course.short_description || course.description}
                  </p>
                )}

                {/* Rating & meta */}
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
                  {(course.rating ?? 0) > 0 && (
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-amber-600 dark:text-amber-400">
                        {(course.rating ?? 0).toFixed(1)}
                      </span>
                      <div className="flex items-center gap-0.5">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star
                            key={i}
                            className={cn("h-3.5 w-3.5", i < Math.round(course.rating ?? 0)
                              ? "text-amber-500 fill-amber-500"
                              : "text-gray-300 dark:text-gray-600"
                            )}
                          />
                        ))}
                      </div>
                      <span className="text-gray-500 dark:text-gray-400">({course.rating_count ?? 0} ratings)</span>
                    </div>
                  )}
                  {course.teacher?.name && (
                    <span className="text-gray-600 dark:text-gray-300">
                      By <span className="font-medium text-blue-600 dark:text-blue-400">{course.teacher.name}</span>
                    </span>
                  )}
                </div>

                {/* Stats row */}
                <div className="flex flex-wrap gap-4 text-sm text-gray-600 dark:text-gray-400 pt-1">
                  {(course.students_count ?? 0) > 0 && (
                    <div className="flex items-center gap-1.5">
                      <Users className="w-4 h-4 text-blue-500" />
                      <span>{course.students_count} students</span>
                    </div>
                  )}
                  {sections.length > 0 && (
                    <div className="flex items-center gap-1.5">
                      <BookOpen className="w-4 h-4 text-blue-500" />
                      <span>{sections.length} sections · {totalVideos} videos</span>
                    </div>
                  )}
                  {course.language && (
                    <div className="flex items-center gap-1.5">
                      <Globe className="w-4 h-4 text-blue-500" />
                      <span>{course.language}</span>
                    </div>
                  )}
                  {course.has_certificate && (
                    <div className="flex items-center gap-1.5">
                      <Award className="w-4 h-4 text-blue-500" />
                      <span>Certificate of completion</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Mobile thumbnail */}
              <div className="lg:hidden rounded-2xl overflow-hidden shadow-md">
                <img src={thumbnailUrl} alt={course.name} className="w-full h-52 sm:h-64 object-cover" />
              </div>

              {/* Mobile CTA */}
              <div className="lg:hidden bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-5 shadow-sm space-y-4">
                <div className="flex items-end gap-3">
                  <span className="text-3xl font-bold text-gray-900 dark:text-white">
                    {getCourseDisplayPrice(course)}
                  </span>
                  {getCourseOriginalPrice(course) && (
                    <span className="text-base text-gray-400 line-through mb-0.5">
                      {getCourseOriginalPrice(course)}
                    </span>
                  )}
                </div>
                <CTAButtons
                  canEnroll={canEnroll}
                  isJoining={isJoining}
                  isCheckingEnrollment={isCheckingEnrollment}
                  joined={joined}
                  courseId={course.id}
                  onJoin={handleJoin}
                />
              </div>

              {/* What you'll learn */}
              {learnings.length > 0 && (
                <section className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6 shadow-sm space-y-4">
                  <h2 className="text-lg font-bold text-gray-900 dark:text-white">What you'll learn</h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2.5">
                    {learnings.map((item, i) => (
                      <div key={i} className="flex items-start gap-2.5">
                        <CheckCircle className="w-4 h-4 shrink-0 text-blue-500 mt-0.5" />
                        <span className="text-sm text-gray-700 dark:text-gray-300">{item}</span>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* Course curriculum */}
              {sections.length > 0 && (
                <section className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-bold text-gray-900 dark:text-white">Course Curriculum</h2>
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      {sections.length} sections · {totalVideos} lessons
                    </span>
                  </div>
                  <div className="space-y-2">
                    {sections.map((section, idx) => (
                      <SectionAccordion
                        key={section.id}
                        section={section}
                        index={idx}
                        isEnrolled={isEnrolled}
                      />
                    ))}
                  </div>
                </section>
              )}

              {/* Requirements */}
              {requirements.length > 0 && (
                <section className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6 shadow-sm space-y-4">
                  <h2 className="text-lg font-bold text-gray-900 dark:text-white">Requirements</h2>
                  <ul className="space-y-2">
                    {requirements.map((item, i) => (
                      <li key={i} className="flex items-start gap-2.5 text-sm text-gray-700 dark:text-gray-300">
                        <span className="mt-2 w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {/* Full description */}
              {course.description && course.description !== course.short_description && (
                <section className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6 shadow-sm space-y-3">
                  <h2 className="text-lg font-bold text-gray-900 dark:text-white">About This Course</h2>
                  <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-line">
                    {course.description}
                  </p>
                </section>
              )}
            </div>

            {/* ── Right / Sticky sidebar ── */}
            <aside className="hidden lg:block w-80 xl:w-96 shrink-0">
              <div className="sticky top-20 space-y-4">
                <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden shadow-md">
                  <img src={thumbnailUrl} alt={course.name} className="w-full h-48 object-cover" />
                  <div className="p-5 space-y-4">
                    <div className="flex items-end gap-3">
                      <span className="text-3xl font-bold text-gray-900 dark:text-white">
                        {getCourseDisplayPrice(course)}
                      </span>
                      {getCourseOriginalPrice(course) && (
                        <span className="text-base text-gray-400 line-through mb-0.5">
                          {getCourseOriginalPrice(course)}
                        </span>
                      )}
                    </div>

                    <CTAButtons
                      canEnroll={canEnroll}
                      isJoining={isJoining}
                      isCheckingEnrollment={isCheckingEnrollment}
                      joined={joined}
                      courseId={course.id}
                      onJoin={handleJoin}
                    />

                    <Separator className="bg-gray-100 dark:bg-gray-800" />

                    <ul className="space-y-2.5 text-sm text-gray-600 dark:text-gray-400">
                      {course.level && (
                        <li className="flex items-center justify-between">
                          <span>Level</span>
                          <span className="font-semibold text-gray-900 dark:text-white capitalize">{course.level}</span>
                        </li>
                      )}
                      {sections.length > 0 && (
                        <li className="flex items-center justify-between">
                          <span>Sections</span>
                          <span className="font-semibold text-gray-900 dark:text-white">{sections.length}</span>
                        </li>
                      )}
                      {totalVideos > 0 && (
                        <li className="flex items-center justify-between">
                          <span>Lessons</span>
                          <span className="font-semibold text-gray-900 dark:text-white">{totalVideos}</span>
                        </li>
                      )}
                      {course.language && (
                        <li className="flex items-center justify-between">
                          <span>Language</span>
                          <span className="font-semibold text-gray-900 dark:text-white">{course.language}</span>
                        </li>
                      )}
                      {course.has_certificate && (
                        <li className="flex items-center justify-between">
                          <span>Certificate</span>
                          <span className="font-semibold text-gray-900 dark:text-white">Yes</span>
                        </li>
                      )}
                      <li className="flex items-center justify-between">
                        <span>Last updated</span>
                        <span className="font-semibold text-gray-900 dark:text-white">{formatDateLabel(course.updated_at)}</span>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </aside>
          </div>
        </div>
        {/* Invoice Modal */}
        {showInvoice && invoice && (
          <CheckoutModal 
            invoice={invoice}
            onClose={() => setShowInvoice(false)}
            onPay={handlePayNow}
            onPayLater={() => setShowInvoice(false)}
            onCancel={handleCancelOrder}
            isCanceling={isCanceling}
          />
        )}
      </div>
    </ProtectedRoute>
  )
}

function CTAButtons({
  canEnroll,
  isJoining,
  isCheckingEnrollment,
  joined,
  courseId,
  onJoin,
}: {
  canEnroll: boolean | undefined
  isJoining: boolean
  isCheckingEnrollment: boolean
  joined: boolean
  courseId: string
  onJoin: () => void
}) {
  if (isCheckingEnrollment) {
    return (
      <Button disabled className="w-full gap-2">
        <Loader2 className="w-4 h-4 animate-spin" /> Checking enrollment...
      </Button>
    )
  }

  if (joined) {
    return (
      <div className="space-y-2">
        <Link href={`/my-course/${courseId}`} className="block">
          <Button className="w-full bg-blue-600 hover:bg-blue-700 gap-2">
            <PlayCircle className="w-4 h-4" /> Start Learning
          </Button>
        </Link>
        <Link href="/my-course" className="block">
          <Button variant="outline" className="w-full">My Courses</Button>
        </Link>
      </div>
    )
  }

  return (
    <Button
      onClick={onJoin}
      disabled={!canEnroll || isJoining}
      className="w-full bg-blue-600 hover:bg-blue-700 gap-2"
    >
      {isJoining ? (
        <><Loader2 className="w-4 h-4 animate-spin" /> Enrolling...</>
      ) : (
        "Join Course"
      )}
    </Button>
  )
}
