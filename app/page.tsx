"use client"

import { useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/AuthContext"
import DocumentationSection from "@/components/documentation-section"
import TestimonialsSection from "../components/testimonials-section"
import FAQSection from "../components/faq-section"
import PricingSection from "../components/pricing-section"
import CTASection from "@/components/cta-section"
import FooterSection from "@/components/footer-section"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

export default function LandingPage() {
  const router = useRouter()
  const { isAuthenticated, isLoading } = useAuth()

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.push("/dashboard")
    }
  }, [isLoading, isAuthenticated, router])

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <header className="sticky top-0 z-20 border-b border-gray-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-4">
          <Link href="/" className="text-lg font-semibold text-gray-900">
            Avla
          </Link>
          <div className="flex items-center gap-2">
            <Button asChild variant="ghost" size="sm">
              <Link href="#features">Features</Link>
            </Button>
            <Button asChild variant="ghost" size="sm">
              <Link href="#pricing">Pricing</Link>
            </Button>
            <Button asChild size="sm" className="text-white">
              <Link href="/auth/login">Login</Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-6xl flex-col gap-16 px-6 py-12">
        <section className="grid items-center gap-8 lg:grid-cols-2">
          <div className="flex flex-col gap-5">
            <Badge variant="secondary" className="bg-gray-100 text-gray-700">
              AI Video-to-Quiz LMS
            </Badge>
            <h1 className="text-3xl font-semibold tracking-tight text-gray-900 sm:text-4xl lg:text-5xl">
              Platform LMS profesional untuk membuat soal otomatis dari video
            </h1>
            <p className="text-sm text-gray-600 sm:text-base">
              Avla membantu institusi dan perusahaan belajar membangun kuis adaptif
              berbasis AI dari materi video, dengan alur belajar yang terukur,
              aman, dan siap skala.
            </p>
            <div className="flex flex-col items-start gap-3 sm:flex-row">
              <Button asChild className="text-white">
                <Link href="/auth/register">Mulai Gratis</Link>
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-4 pt-3 text-sm text-gray-600 sm:grid-cols-3">
              <div>
                <p className="text-xl font-semibold text-gray-900">10k+</p>
                <p>Generated quizzes</p>
              </div>
              <div>
                <p className="text-xl font-semibold text-gray-900">500+</p>
                <p>Video classes</p>
              </div>
              <div>
                <p className="text-xl font-semibold text-gray-900">99.9%</p>
                <p>Platform uptime</p>
              </div>
            </div>
          </div>
          <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white p-3 shadow-sm">
            <img
              src="/lms-dummy.svg"
              alt="Avla LMS dashboard preview"
              className="h-[320px] w-full rounded-xl object-cover"
            />
          </div>
        </section>

        <section id="features" className="grid gap-4 md:grid-cols-3">
          {[
            {
              title: "AI Quiz Generator",
              description:
                "Generate soal pilihan ganda dari video secara otomatis dengan kontrol tingkat kesulitan.",
            },
            {
              title: "Adaptive Playback",
              description:
                "Kuis muncul tepat di timestamp pembelajaran untuk meningkatkan retensi belajar.",
            },
            {
              title: "Secure Evaluation",
              description:
                "Validasi jawaban dilakukan server-side untuk mencegah kebocoran kunci jawaban.",
            },
          ].map((item) => (
            <div
              key={item.title}
              className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm"
            >
              <h3 className="text-base font-semibold text-gray-900">
                {item.title}
              </h3>
              <p className="mt-2 text-sm text-gray-600">{item.description}</p>
            </div>
          ))}
        </section>

        <DocumentationSection />
        <TestimonialsSection />
        <div id="pricing">
          <PricingSection />
        </div>
        <FAQSection />
        <CTASection />
        <FooterSection />
      </main>
    </div>
  )
}
