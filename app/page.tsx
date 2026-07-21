"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import {
  BarChart3,
  Building2,
  GraduationCap,
  Shield,
  Sparkles,
  Video,
} from "lucide-react"
import { useAuth } from "@/lib/contexts/AuthContext"
import TestimonialsSection from "../lib/components/testimonials-section"
import FAQSection from "../lib/components/faq-section"
import CTASection from "@/lib/components/cta-section"
import FooterSection from "@/lib/components/footer-section"
import { HeroSection } from "@/lib/components/ui/hero-section-1"
import { BentoCard, BentoGrid } from "@/lib/components/ui/bento-grid"
import { Marquee } from "@/lib/components/ui/marquee"
import { cn } from "@/lib/utils"

const metricCards = [
  { label: "Assessments", value: "12.4k" },
  { label: "Avg. score", value: "87%" },
  { label: "Teams", value: "340+" },
  { label: "Uptime", value: "99.9%" },
]

const bentoFeatures = [
  {
    Icon: Video,
    name: "AI-Powered Video Assessment",
    description:
      "Generate questions and evaluations automatically from video content using advanced AI analysis.",
    href: "#features",
    cta: "Explore AI tools",
    className: "col-span-1 sm:col-span-3 lg:col-span-2",
    background: (
      <div className="absolute inset-0 bg-gradient-to-br from-blue-50/90 via-white/50 to-sky-50/60" />
    ),
  },
  {
    Icon: BarChart3,
    name: "Real-time Analytics",
    description:
      "Monitor engagement and performance metrics with comprehensive dashboards and reporting.",
    href: "#features",
    cta: "View analytics",
    className: "col-span-1 sm:col-span-3 lg:col-span-1",
    background: (
      <Marquee
        vertical
        pauseOnHover
        className="absolute top-4 right-0 h-[280px] w-full [--duration:28s] [mask-image:linear-gradient(to_top,transparent_10%,#000_85%)]"
      >
        {metricCards.map((card) => (
          <figure
            key={card.label}
            className={cn(
              "relative w-36 cursor-default overflow-hidden rounded-xl border border-blue-100 bg-white p-3 shadow-sm",
              "transition-colors duration-200 hover:border-blue-200"
            )}
          >
            <figcaption className="text-xs font-medium text-gray-500">
              {card.label}
            </figcaption>
            <p className="mt-1 text-lg font-semibold text-gray-900">
              {card.value}
            </p>
          </figure>
        ))}
      </Marquee>
    ),
  },
  {
    Icon: Shield,
    name: "Secure Cloud Infrastructure",
    description:
      "Enterprise-grade security with end-to-end encryption and industry-standard compliance.",
    href: "#pricing",
    cta: "Security details",
    className: "col-span-1 sm:col-span-3 lg:col-span-1",
    background: (
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="flex h-32 w-32 items-center justify-center rounded-full border border-blue-100 bg-blue-50/80">
          <Shield className="h-14 w-14 text-primary/80" aria-hidden />
        </div>
      </div>
    ),
  },
  {
    Icon: Sparkles,
    name: "Workflow Automation",
    description:
      "Orchestrate assessments, approvals, and notifications with measurable, scalable IT service flows.",
    href: "/auth/register",
    cta: "Start free trial",
    className: "col-span-1 sm:col-span-3 lg:col-span-2",
    background: (
      <div className="absolute inset-0 overflow-hidden">
        <Marquee
          pauseOnHover
          className="absolute top-8 [--duration:32s] [mask-image:linear-gradient(to_top,transparent_20%,#000_90%)]"
        >
          {["SOC 2", "ISO 27001", "GDPR", "HIPAA-ready", "SSO", "RBAC"].map(
            (badge) => (
              <span
                key={badge}
                className="mx-2 inline-flex cursor-default items-center rounded-full border border-blue-100 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm"
              >
                {badge}
              </span>
            )
          )}
        </Marquee>
      </div>
    ),
  },
]

export default function LandingPage() {
  const router = useRouter()
  const { isAuthenticated, isLoading } = useAuth()
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
  }, [])

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.push("/my-video")
    }
  }, [isLoading, isAuthenticated, router])

  if (!isMounted) {
    return null
  }

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#EFF6FF] text-gray-900" suppressHydrationWarning>
      <HeroSection />

      <main className="relative mx-auto flex w-full max-w-6xl flex-col gap-12 sm:gap-20 px-4 sm:px-6 py-10 sm:py-16">

        <section id="features" className="scroll-mt-24">
          <div className="mb-10 text-center">
            <h1 className="mt-4 text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight text-gray-900">
              Everything you need for video assessment
            </h1>
            <p className="mx-auto mt-3 max-w-2xl text-sm sm:text-base leading-relaxed text-gray-600">
              Effective learning process, standardized curriculum, and real-time dashboard —
              designed for effective learning process.
            </p>
          </div>

          <BentoGrid>
            {bentoFeatures.map((feature) => (
              <BentoCard key={feature.name} {...feature} />
            ))}
          </BentoGrid>
        </section>

        <section aria-label="Use cases" className="grid gap-4 sm:grid-cols-3">
          {[
            {
              icon: Building2,
              title: "Enterprise IT",
              text: "Managed services dengan SLA dan audit trail.",
            },
            {
              icon: GraduationCap,
              title: "L&D Teams",
              text: "Onboarding dan sertifikasi berbasis video.",
            },
            {
              icon: BarChart3,
              title: "Operations",
              text: "Dashboard real-time untuk keputusan cepat.",
            },
          ].map((item) => (
            <div
              key={item.title}
              className="rounded-xl border border-blue-100 bg-white p-5 shadow-sm transition-colors duration-200 hover:border-blue-200"
            >
              <item.icon className="h-6 w-6 text-primary" aria-hidden />
              <h3 className="mt-3 text-base font-semibold text-gray-900">
                {item.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-gray-600">
                {item.text}
              </p>
            </div>
          ))}
        </section>
      </main>

      <div className="w-full bg-slate-900 py-10 sm:py-16 px-4 sm:px-6">
        <div className="mx-auto max-w-6xl">
          <TestimonialsSection />
        </div>
      </div>

      <main className="mx-auto flex w-full max-w-6xl flex-col gap-10 sm:gap-16 px-4 sm:px-6 py-10 sm:py-16">
        <FAQSection />
        <CTASection />
        <FooterSection />
      </main>
    </div>
  )
}
