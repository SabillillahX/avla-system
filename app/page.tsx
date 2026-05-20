"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/AuthContext"
import DocumentationSection from "@/components/documentation-section"
import TestimonialsSection from "../components/testimonials-section"
import FAQSection from "../components/faq-section"
import PricingSection from "../components/pricing-section"
import CTASection from "@/components/cta-section"
import FooterSection from "@/components/footer-section"
import { Hero2 } from "@/components/ui/hero-2-1"

const featureItems = [
  {
    title: "AI-Powered Video Assessment",
    description:
      "Generate questions and evaluations automatically from video content using advanced AI analysis.",
  },
  {
    title: "Real-time Analytics Dashboard",
    description:
      "Monitor engagement and performance metrics with comprehensive analytics and reporting.",
  },
  {
    title: "Secure Cloud Infrastructure",
    description:
      "Enterprise-grade security with end-to-end encryption and compliance with industry standards.",
  },
]

export default function LandingPage() {
  const router = useRouter()
  const { isAuthenticated, isLoading } = useAuth()

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.push("/dashboard")
    }
  }, [isLoading, isAuthenticated, router])

  return (
    <div className="min-h-screen bg-[#EFF6FF] text-gray-900">
      {/* Full-bleed Hero — has its own nav, no outer header */}
      <Hero2 />

      <main className="mx-auto flex w-full max-w-6xl flex-col gap-16 px-6 py-12">
        <section id="features" className="grid gap-4 md:grid-cols-3">
          {featureItems.map((item) => (
            <div
              key={item.title}
              className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition-transform duration-300 hover:-translate-y-1 hover:shadow-md"
            >
              <h3 className="text-base font-semibold text-gray-900">
                {item.title}
              </h3>
              <p className="mt-2 text-sm text-gray-600">{item.description}</p>
            </div>
          ))}
        </section>

        <DocumentationSection />
      </main>

      {/* Full-bleed dark testimonials — matches hero palette */}
      <div className="w-full bg-black py-16 px-6">
        <div className="mx-auto max-w-6xl">
          <TestimonialsSection />
        </div>
      </div>

      <main className="mx-auto flex w-full max-w-6xl flex-col gap-16 px-6 py-12">
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
