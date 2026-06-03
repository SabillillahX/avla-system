"use client"

import React from "react"
import Link from "next/link"
import Image from "next/image"
import { ArrowRight, ChevronRight, Menu, X, Zap } from "lucide-react"

import { Button } from "@/components/ui/button"
import { AnimatedGroup } from "@/components/ui/animated-group"
import { RadialGradientBackground } from "@/components/ui/gradient-backgrounds"
import { cn } from "@/lib/utils"

const DASHBOARD_IMG =
  "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=2700&q=75&auto=format&fit=crop"

const menuItems = [
  { name: "Features", href: "#features" },
  { name: "Pricing", href: "#pricing" },
  { name: "Documentation", href: "#features" },
  { name: "About", href: "#pricing" },
]

const customerLogos = [
  {
    name: "Nvidia",
    src: "https://cdn.simpleicons.org/nvidia/1e40af",
  },
  {
    name: "GitHub",
    src: "https://cdn.simpleicons.org/github/1e40af",
  },
  {
    name: "Google",
    src: "https://cdn.simpleicons.org/google/1e40af",
  },
  {
    name: "Microsoft",
    src: "https://cdn.simpleicons.org/microsoft/1e40af",
  },
  {
    name: "Amazon",
    src: "https://cdn.simpleicons.org/amazon/1e40af",
  },
  {
    name: "IBM",
    src: "https://cdn.simpleicons.org/ibm/1e40af",
  },
  {
    name: "Oracle",
    src: "https://cdn.simpleicons.org/oracle/1e40af",
  },
  {
    name: "SAP",
    src: "https://cdn.simpleicons.org/sap/1e40af",
  },
]

export function HeroSection() {
  return (
    <>
      <HeroHeader />
      <main className="relative overflow-hidden bg-[#EFF6FF]">
        <section className="relative min-h-[90vh]">
          <RadialGradientBackground variant="hero-bottom" />
          <div className="relative z-10 pt-24 md:pt-32">
            <div className="mx-auto max-w-7xl px-6">
              <div className="text-center sm:mx-auto lg:mr-auto lg:mt-0">
                <AnimatedGroup
                  immediate
                  preset="slide"
                  className="flex flex-col items-center"
                >
                  <h1 className="mt-8 max-w-4xl text-balance text-4xl font-extrabold tracking-tight text-blue-950 sm:text-5xl md:text-6xl lg:mt-12 lg:text-7xl">
                    #1 AI Learning Platform with Video Assessment
                  </h1>
                  <p className="mx-auto mt-6 max-w-2xl text-balance text-base leading-relaxed text-blue-950 sm:text-lg">
                    Avla help people to learn and grow within effective learning process. Everything was standardized and automated.
                  </p>
                </AnimatedGroup>

                <AnimatedGroup
                  immediate
                  preset="fade"
                  className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row"
                >
                  <Button
                    asChild
                    size="lg"
                    className="cursor-pointer rounded-xl bg-primary px-6 text-base shadow-sm hover:bg-primary/90"
                  >
                    <Link href="/auth/register">
                      <span className="text-nowrap">Start for free</span>
                    </Link>
                  </Button>
                </AnimatedGroup>
              </div>
            </div>

            <AnimatedGroup
              immediate
              preset="fade"
              className="relative mt-10 sm:mt-14 md:mt-16"
            >
              <div className="relative overflow-hidden px-2 sm:px-6">
                <div
                  aria-hidden
                  className="pointer-events-none absolute inset-0 z-10 bg-gradient-to-b from-transparent from-60% to-[#EFF6FF]"
                />
                <div className="relative mx-auto max-w-6xl overflow-hidden rounded-2xl border border-blue-100 bg-white p-2 shadow-lg shadow-blue-900/5 ring-1 ring-blue-100/80 sm:p-4">
                  <Image
                    src={DASHBOARD_IMG}
                    alt="Avla dashboard — analytics and video assessment"
                    width={2700}
                    height={1440}
                    className="relative aspect-[15/8] w-full rounded-xl object-cover"
                    priority
                    sizes="(max-width: 1280px) 100vw, 1152px"
                  />
                </div>
              </div>
            </AnimatedGroup>
          </div>
        </section>

      </main>
    </>
  )
}

const HeroHeader = () => {
  const [menuState, setMenuState] = React.useState(false)
  const [isScrolled, setIsScrolled] = React.useState(false)
  const [isMounted, setIsMounted] = React.useState(false)

  React.useEffect(() => {
    setIsMounted(true)
  }, [])

  React.useEffect(() => {
    if (!isMounted) return

    const handleScroll = () => setIsScrolled(window.scrollY > 50)
    window.addEventListener("scroll", handleScroll, { passive: true })
    return () => window.removeEventListener("scroll", handleScroll)
  }, [isMounted])

  return (
    <header>
      <nav
        data-state={menuState ? "active" : undefined}
        className="group fixed z-20 w-full px-2"
      >
        <div
          className={cn(
            "mx-auto mt-2 max-w-6xl px-6 transition-all duration-300 lg:px-12",
            isScrolled &&
            "max-w-4xl rounded-2xl border border-blue-100/80 bg-white/90 shadow-sm backdrop-blur-md lg:px-5"
          )}
        >
          <div className="relative flex flex-wrap items-center justify-between gap-6 py-3 lg:gap-0 lg:py-4">
            <div className="flex w-full justify-between lg:w-auto">
              <Link
                href="/"
                aria-label="Avla home"
                className="flex cursor-pointer items-center gap-2"
              >
                <Image src="/logo-black.png" alt="Avla Logo" width={400} height={400} className="h-8 md:h-16 w-auto dark:hidden" />
                <Image src="/logo-white.png" alt="Avla Logo" width={400} height={400} className="h-8 md:h-16 w-auto hidden dark:block" />
              </Link>

              <button
                type="button"
                onClick={() => setMenuState(!menuState)}
                aria-label={menuState ? "Close menu" : "Open menu"}
                aria-expanded={menuState}
                className="relative z-20 -m-2.5 -mr-4 block cursor-pointer p-2.5 lg:hidden"
              >
                <Menu className="m-auto size-6 text-gray-700 duration-200 group-data-[state=active]:scale-0 group-data-[state=active]:opacity-0" />
                <X className="absolute inset-0 m-auto size-6 -rotate-180 scale-0 text-gray-700 opacity-0 duration-200 group-data-[state=active]:rotate-0 group-data-[state=active]:scale-100 group-data-[state=active]:opacity-100" />
              </button>
            </div>

            <div className="absolute inset-0 m-auto hidden size-fit lg:block">
              <ul className="flex gap-8 text-sm">
                {menuItems.map((item) => (
                  <li key={item.name}>
                    <Link
                      href={item.href}
                      className="block cursor-pointer text-gray-600 transition-colors duration-150 hover:text-primary"
                    >
                      {item.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div
              className={cn(
                "mb-6 hidden w-full flex-wrap items-center justify-end space-y-8 rounded-3xl border border-blue-100 bg-white p-6 shadow-lg md:flex-nowrap lg:m-0 lg:flex lg:w-fit lg:gap-3 lg:space-y-0 lg:border-transparent lg:bg-transparent lg:p-0 lg:shadow-none",
                "group-data-[state=active]:flex"
              )}
            >
              <div className="lg:hidden">
                <ul className="space-y-6 text-base">
                  {menuItems.map((item) => (
                    <li key={item.name}>
                      <Link
                        href={item.href}
                        onClick={() => setMenuState(false)}
                        className="block cursor-pointer text-blue-700 font-medium hover:text-blue-900"
                      >
                        {item.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="flex w-full flex-col space-y-3 sm:flex-row sm:gap-3 sm:space-y-0 md:w-fit">
                <Button
                  asChild
                  variant="outline"
                  size="sm"
                  className={cn(
                    "cursor-pointer border-blue-200",
                    isScrolled && "lg:hidden"
                  )}
                >
                  <Link href="/auth/login">
                    <span>Masuk</span>
                  </Link>
                </Button>
                <Button
                  asChild
                  size="sm"
                  className={cn(
                    "cursor-pointer bg-primary hover:bg-primary/90",
                    isScrolled && "lg:hidden"
                  )}
                >
                  <Link href="/auth/register">
                    <span>Daftar</span>
                  </Link>
                </Button>
                <Button
                  asChild
                  size="sm"
                  className={cn(
                    "cursor-pointer bg-primary hover:bg-primary/90",
                    isScrolled ? "lg:inline-flex" : "hidden"
                  )}
                >
                  <Link href="/auth/register">
                    <span>Mulai Gratis</span>
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </nav>
    </header>
  )
}
