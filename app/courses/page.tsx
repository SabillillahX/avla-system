'use client'

import { Button } from "@/components/ui/button"
import { ProtectedRoute } from "@/components/auth/ProtectedRoute"
import { ChevronRight, Star } from "lucide-react"

interface Course {
  id: string
  title: string
  subtitle: string
  author: string
  rating: number
  ratingCount: number
  price: string
  originalPrice: string
  badges: string[]
  imageUrl: string
}

const trendingCourses: Course[] = [
  {
    id: "trend-1",
    title: "AI Engineer Agentic Track: The Complete Agent & MCP Course",
    subtitle: "Ed Donner, Licency",
    author: "Ed Donner, Licency",
    rating: 4.7,
    ratingCount: 39719,
    price: "Rp129,000",
    originalPrice: "Rp169,000",
    badges: ["Premium", "Bestseller"],
    imageUrl: "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?q=80&w=1200&auto=format&fit=crop",
  },
  {
    id: "trend-2",
    title: "AI Engineer Core Track: LLM Engineering, RAG, QLoRA, ...",
    subtitle: "Licency, Ed Donner",
    author: "Licency, Ed Donner",
    rating: 4.7,
    ratingCount: 34560,
    price: "Rp129,000",
    originalPrice: "Rp169,000",
    badges: ["Premium", "Bestseller"],
    imageUrl: "https://images.unsplash.com/photo-1504384308090-c894fdcc538d?q=80&w=1200&auto=format&fit=crop",
  },
  {
    id: "trend-3",
    title: "Generative AI for Beginners",
    subtitle: "Aakriti E-Learning Academy",
    author: "Aakriti E-Learning Academy",
    rating: 4.5,
    ratingCount: 111895,
    price: "Rp129,000",
    originalPrice: "Rp169,000",
    badges: ["Premium", "Bestseller"],
    imageUrl: "https://images.unsplash.com/photo-1487058792275-0ad4aaf24ca7?q=80&w=1200&auto=format&fit=crop",
  },
  {
    id: "trend-4",
    title: "100 Days of Code: The Complete Python Pro Bootcamp",
    subtitle: "Dr. Angela Yu",
    author: "Dr. Angela Yu",
    rating: 4.7,
    ratingCount: 423099,
    price: "Rp129,000",
    originalPrice: "Rp169,000",
    badges: ["Premium", "Bestseller"],
    imageUrl: "https://images.unsplash.com/photo-1522204523234-8729aa6e3d5f?q=80&w=1200&auto=format&fit=crop",
  },
  {
    id: "trend-5",
    title: "Ultimate AWS Certified Solutions Architect Associate 2026",
    subtitle: "Stephane Maarek",
    author: "Stephane Maarek",
    rating: 4.7,
    ratingCount: 289163,
    price: "Rp129,000",
    originalPrice: "Rp169,000",
    badges: ["Premium", "Bestseller"],
    imageUrl: "https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?q=80&w=1200&auto=format&fit=crop",
  },
]

const topDevelopmentCourses: Course[] = [
  {
    id: "dev-1",
    title: "AI Coder: Complete Claude Code & Coding Agents Course",
    subtitle: "Licency, Ed Donner",
    author: "Licency, Ed Donner",
    rating: 4.7,
    ratingCount: 5352,
    price: "Rp109,000",
    originalPrice: "Rp149,000",
    badges: ["Premium", "Bestseller"],
    imageUrl: "https://images.unsplash.com/photo-1487014679447-9f8336841d58?q=80&w=1200&auto=format&fit=crop",
  },
  {
    id: "dev-2",
    title: "Claude Code - The Practical Guide",
    subtitle: "Academind by Maximilian Schwarzmuller",
    author: "Academind by Maximilian Schwarzmuller",
    rating: 4.6,
    ratingCount: 8257,
    price: "Rp109,000",
    originalPrice: "Rp149,000",
    badges: ["Premium"],
    imageUrl: "https://images.unsplash.com/photo-1515879218367-8466d910aaa4?q=80&w=1200&auto=format&fit=crop",
  },
  {
    id: "dev-3",
    title: "OpenClaw: Run Powerful & Autonomous AI Agents Securely",
    subtitle: "Arnold Oberleiter",
    author: "Arnold Oberleiter",
    rating: 4.7,
    ratingCount: 725,
    price: "Rp109,000",
    originalPrice: "Rp149,000",
    badges: ["Premium", "Bestseller"],
    imageUrl: "https://images.unsplash.com/photo-1498050108023-c5249f4df085?q=80&w=1200&auto=format&fit=crop",
  },
  {
    id: "dev-4",
    title: "AI Builder: Create Agents, Voice Agents & Automations in n8n",
    subtitle: "Licency, Ed Donner",
    author: "Licency, Ed Donner",
    rating: 4.8,
    ratingCount: 2284,
    price: "Rp109,000",
    originalPrice: "Rp149,000",
    badges: ["Premium", "Bestseller"],
    imageUrl: "https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?q=80&w=1200&auto=format&fit=crop",
  },
  {
    id: "dev-5",
    title: "AI Engineer Production Track: Deploy LLMs & Agents at Scale",
    subtitle: "Licency, Ed Donner",
    author: "Licency, Ed Donner",
    rating: 4.7,
    ratingCount: 2902,
    price: "Rp129,000",
    originalPrice: "Rp169,000",
    badges: ["Premium"],
    imageUrl: "https://images.unsplash.com/photo-1484417894907-623942c8ee29?q=80&w=1200&auto=format&fit=crop",
  },
]

const formatCount = (value: number) => value.toLocaleString("en-US")

export default function CoursesPage() {
  return (
    <ProtectedRoute>
      <div className="p-6 space-y-10">
        <section>
          <div className="mb-6">
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Thursday, 20th February</p>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Good Evening! John, ready to learn?</h2>

            <div className="flex items-center space-x-6 mb-6">
              <Button
                variant="outline"
                size="sm"
                className="border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 bg-transparent"
              >
                Share
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 bg-transparent"
              >
                Browse Courses
              </Button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-6">
            <div className="flex items-center">
              <span className="font-semibold text-gray-900 dark:text-white">12hrs</span>
              <span className="text-sm text-gray-500 dark:text-gray-400 ml-1">Hours Learned</span>
            </div>
            <div className="flex items-center">
              <span className="font-semibold text-gray-900 dark:text-white">24</span>
              <span className="text-sm text-gray-500 dark:text-gray-400 ml-1">Courses Completed</span>
            </div>
            <div className="flex items-center">
              <span className="font-semibold text-gray-900 dark:text-white">7</span>
              <span className="text-sm text-gray-500 dark:text-gray-400 ml-1">Courses In Progress</span>
            </div>
          </div>
        </section>

        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Trending courses</h2>
          </div>
          <div className="relative">
            <div className="flex gap-5 overflow-x-auto pb-2 pr-10">
              {trendingCourses.map((course) => (
                <div key={course.id} className="w-[250px] shrink-0">
                  <div className="rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800">
                    <img
                      src={course.imageUrl}
                      alt={course.title}
                      className="h-[140px] w-full object-cover"
                    />
                  </div>
                  <div className="mt-3 space-y-2">
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white line-clamp-2">
                      {course.title}
                    </h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-1">
                      {course.subtitle}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-gray-700 dark:text-gray-300">
                      <span className="font-semibold text-amber-700 dark:text-amber-400">
                        {course.rating.toFixed(1)}
                      </span>
                      <div className="flex items-center gap-1">
                        {Array.from({ length: 5 }).map((_, index) => (
                          <Star
                            key={`${course.id}-star-${index}`}
                            className={`h-3 w-3 ${index < Math.round(course.rating)
                              ? "text-amber-500 fill-amber-500"
                              : "text-gray-300 dark:text-gray-600"
                              }`}
                          />
                        ))}
                      </div>
                      <span>({formatCount(course.ratingCount)})</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-gray-900 dark:text-white">
                        {course.price}
                      </span>
                      <span className="text-xs text-gray-400 line-through">{course.originalPrice}</span>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      {course.badges.map((badge) => (
                        <span
                          key={`${course.id}-${badge}`}
                          className={`px-2 py-0.5 rounded-md text-[11px] font-semibold ${
                            badge === "Premium"
                              ? "bg-indigo-600 text-white"
                              : "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200"
                          }`}
                        >
                          {badge}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <Button
              variant="outline"
              size="icon"
              className="absolute right-0 top-12 h-10 w-10 rounded-full bg-white dark:bg-gray-800 shadow"
              aria-label="Scroll right"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </section>

        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Top courses in Development</h2>
          </div>
          <div className="relative">
            <div className="flex gap-5 overflow-x-auto pb-2 pr-10">
              {topDevelopmentCourses.map((course) => (
                <div key={course.id} className="w-[250px] shrink-0">
                  <div className="rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800">
                    <img
                      src={course.imageUrl}
                      alt={course.title}
                      className="h-[140px] w-full object-cover"
                    />
                  </div>
                  <div className="mt-3 space-y-2">
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white line-clamp-2">
                      {course.title}
                    </h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-1">
                      {course.subtitle}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-gray-700 dark:text-gray-300">
                      <span className="font-semibold text-amber-700 dark:text-amber-400">
                        {course.rating.toFixed(1)}
                      </span>
                      <div className="flex items-center gap-1">
                        {Array.from({ length: 5 }).map((_, index) => (
                          <Star
                            key={`${course.id}-star-${index}`}
                            className={`h-3 w-3 ${index < Math.round(course.rating)
                              ? "text-amber-500 fill-amber-500"
                              : "text-gray-300 dark:text-gray-600"
                              }`}
                          />
                        ))}
                      </div>
                      <span>({formatCount(course.ratingCount)})</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-gray-900 dark:text-white">
                        {course.price}
                      </span>
                      <span className="text-xs text-gray-400 line-through">{course.originalPrice}</span>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      {course.badges.map((badge) => (
                        <span
                          key={`${course.id}-${badge}`}
                          className={`px-2 py-0.5 rounded-md text-[11px] font-semibold ${
                            badge === "Premium"
                              ? "bg-indigo-600 text-white"
                              : "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200"
                          }`}
                        >
                          {badge}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <Button
              variant="outline"
              size="icon"
              className="absolute right-0 top-12 h-10 w-10 rounded-full bg-white dark:bg-gray-800 shadow"
              aria-label="Scroll right"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </section>
      </div>
    </ProtectedRoute>
  )
}
