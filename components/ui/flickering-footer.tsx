"use client"

import * as Color from "color-bits"
import { ChevronRight, Shield, Zap } from "lucide-react"
import { useReducedMotion } from "motion/react"
import Link from "next/link"
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react"

import { cn } from "@/lib/utils"

export const getRGBA = (
  cssColor: React.CSSProperties["color"],
  fallback = "rgba(148, 163, 184, 0.8)"
): string => {
  if (typeof window === "undefined") return fallback
  if (!cssColor) return fallback

  try {
    if (typeof cssColor === "string" && cssColor.startsWith("var(")) {
      const element = document.createElement("div")
      element.style.color = cssColor
      document.body.appendChild(element)
      const computedColor = window.getComputedStyle(element).color
      document.body.removeChild(element)
      return Color.formatRGBA(Color.parse(computedColor))
    }
    return Color.formatRGBA(Color.parse(cssColor))
  } catch {
    return fallback
  }
}

export const colorWithOpacity = (color: string, opacity: number): string => {
  if (!color.startsWith("rgb")) return color
  return Color.formatRGBA(Color.alpha(Color.parse(color), opacity))
}

interface FlickeringGridProps extends React.HTMLAttributes<HTMLDivElement> {
  squareSize?: number
  gridGap?: number
  flickerChance?: number
  color?: string
  width?: number
  height?: number
  maxOpacity?: number
  text?: string
  fontSize?: number
  fontWeight?: number | string
}

export const FlickeringGrid: React.FC<FlickeringGridProps> = ({
  squareSize = 3,
  gridGap = 3,
  flickerChance = 0.2,
  color = "#93C5FD",
  width,
  height,
  className,
  maxOpacity = 0.15,
  text = "",
  fontSize = 140,
  fontWeight = 600,
  ...props
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const reduceMotion = useReducedMotion()
  const [isInView, setIsInView] = useState(false)
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 })

  const memoizedColor = useMemo(() => getRGBA(color), [color])

  const drawGrid = useCallback(
    (
      ctx: CanvasRenderingContext2D,
      canvasWidth: number,
      canvasHeight: number,
      cols: number,
      rows: number,
      squares: Float32Array,
      dpr: number
    ) => {
      ctx.clearRect(0, 0, canvasWidth, canvasHeight)

      const maskCanvas = document.createElement("canvas")
      maskCanvas.width = canvasWidth
      maskCanvas.height = canvasHeight
      const maskCtx = maskCanvas.getContext("2d", { willReadFrequently: true })
      if (!maskCtx) return

      if (text) {
        maskCtx.save()
        maskCtx.scale(dpr, dpr)
        maskCtx.fillStyle = "white"
        maskCtx.font = `${fontWeight} ${fontSize}px system-ui, sans-serif`
        maskCtx.textAlign = "center"
        maskCtx.textBaseline = "middle"
        maskCtx.fillText(text, canvasWidth / (2 * dpr), canvasHeight / (2 * dpr))
        maskCtx.restore()
      }

      for (let i = 0; i < cols; i++) {
        for (let j = 0; j < rows; j++) {
          const x = i * (squareSize + gridGap) * dpr
          const y = j * (squareSize + gridGap) * dpr
          const squareWidth = squareSize * dpr
          const squareHeight = squareSize * dpr

          const maskData = maskCtx.getImageData(
            x,
            y,
            squareWidth,
            squareHeight
          ).data
          const hasText = maskData.some(
            (value, index) => index % 4 === 0 && value > 0
          )

          const opacity = squares[i * rows + j]
          const finalOpacity = hasText
            ? Math.min(1, opacity * 3 + 0.4)
            : opacity

          ctx.fillStyle = colorWithOpacity(memoizedColor, finalOpacity)
          ctx.fillRect(x, y, squareWidth, squareHeight)
        }
      }
    },
    [memoizedColor, squareSize, gridGap, text, fontSize, fontWeight]
  )

  const setupCanvas = useCallback(
    (canvas: HTMLCanvasElement, w: number, h: number) => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      canvas.width = w * dpr
      canvas.height = h * dpr
      canvas.style.width = `${w}px`
      canvas.style.height = `${h}px`
      const cols = Math.ceil(w / (squareSize + gridGap))
      const rows = Math.ceil(h / (squareSize + gridGap))
      const squares = new Float32Array(cols * rows)
      for (let i = 0; i < squares.length; i++) {
        squares[i] = Math.random() * maxOpacity
      }
      return { cols, rows, squares, dpr }
    },
    [squareSize, gridGap, maxOpacity]
  )

  const updateSquares = useCallback(
    (squares: Float32Array, deltaTime: number) => {
      if (reduceMotion) return
      for (let i = 0; i < squares.length; i++) {
        if (Math.random() < flickerChance * deltaTime) {
          squares[i] = Math.random() * maxOpacity
        }
      }
    },
    [flickerChance, maxOpacity, reduceMotion]
  )

  useEffect(() => {
    const canvas = canvasRef.current
    const container = containerRef.current
    if (!canvas || !container) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    let animationFrameId = 0
    let gridParams = setupCanvas(canvas, 0, 0)

    const updateCanvasSize = () => {
      const newWidth = width || container.clientWidth
      const newHeight = height || container.clientHeight
      setCanvasSize({ width: newWidth, height: newHeight })
      gridParams = setupCanvas(canvas, newWidth, newHeight)
      if (!reduceMotion) {
        drawGrid(
          ctx,
          canvas.width,
          canvas.height,
          gridParams.cols,
          gridParams.rows,
          gridParams.squares,
          gridParams.dpr
        )
      }
    }

    updateCanvasSize()

    let lastTime = 0
    const animate = (time: number) => {
      if (!isInView || reduceMotion) return
      const deltaTime = (time - lastTime) / 1000
      lastTime = time
      updateSquares(gridParams.squares, deltaTime)
      drawGrid(
        ctx,
        canvas.width,
        canvas.height,
        gridParams.cols,
        gridParams.rows,
        gridParams.squares,
        gridParams.dpr
      )
      animationFrameId = requestAnimationFrame(animate)
    }

    const resizeObserver = new ResizeObserver(updateCanvasSize)
    resizeObserver.observe(container)

    const intersectionObserver = new IntersectionObserver(
      ([entry]) => setIsInView(entry.isIntersecting),
      { threshold: 0 }
    )
    intersectionObserver.observe(canvas)

    if (isInView && !reduceMotion) {
      animationFrameId = requestAnimationFrame(animate)
    }

    return () => {
      cancelAnimationFrame(animationFrameId)
      resizeObserver.disconnect()
      intersectionObserver.disconnect()
    }
  }, [
    setupCanvas,
    updateSquares,
    drawGrid,
    width,
    height,
    isInView,
    reduceMotion,
  ])

  return (
    <div ref={containerRef} className={cn("h-full w-full", className)} {...props}>
      <canvas
        ref={canvasRef}
        className="pointer-events-none"
        aria-hidden
        style={{ width: canvasSize.width, height: canvasSize.height }}
      />
    </div>
  )
}

function useMediaQuery(query: string) {
  const [value, setValue] = useState(false)

  useEffect(() => {
    const checkQuery = () => setValue(window.matchMedia(query).matches)
    checkQuery()
    const mediaQuery = window.matchMedia(query)
    mediaQuery.addEventListener("change", checkQuery)
    return () => mediaQuery.removeEventListener("change", checkQuery)
  }, [query])

  return value
}

const footerLinks = [
  {
    title: "Produk",
    links: [
      { id: 1, title: "Fitur", url: "#features" },
      { id: 2, title: "Harga", url: "#pricing" },
      { id: 3, title: "Dashboard", url: "/auth/login" },
    ],
  },
  {
    title: "Perusahaan",
    links: [
      { id: 4, title: "Tentang", url: "#features" },
      { id: 5, title: "Kontak", url: "/auth/login" },
      { id: 6, title: "Dukungan", url: "/auth/login" },
    ],
  },
  {
    title: "Resources",
    links: [
      { id: 7, title: "Mulai Gratis", url: "/auth/register" },
      { id: 8, title: "Masuk", url: "/auth/login" },
      { id: 9, title: "Customer Stories", url: "#testimonials" },
    ],
  },
]

const complianceBadges = ["SOC 2", "ISO 27001", "GDPR"]

function FooterLink({
  href,
  title,
}: {
  href: string
  title: string
}) {
  return (
    <li className="group inline-flex cursor-pointer items-center justify-start gap-1 text-[15px] leading-snug text-gray-600 transition-colors duration-200 hover:text-primary">
      <Link href={href}>{title}</Link>
      <div className="flex size-4 translate-x-0 items-center justify-center rounded border border-blue-200 bg-white opacity-0 transition-all duration-300 ease-out group-hover:translate-x-1 group-hover:opacity-100">
        <ChevronRight className="h-3 w-3 text-primary" aria-hidden />
      </div>
    </li>
  )
}

export function FlickeringFooter() {
  const tablet = useMediaQuery("(max-width: 1024px)")
  const reduceMotion = useReducedMotion()

  return (
    <footer
      id="footer"
      className="relative w-full overflow-hidden border-t border-blue-100 bg-[#EFF6FF] pb-0"
    >
      <div className="mx-auto flex max-w-6xl flex-col p-8 md:flex-row md:items-start md:justify-between md:p-10 lg:px-6">
        <div className="mx-0 flex max-w-xs flex-col items-start justify-start gap-y-5">
          <Link
            href="/"
            className="flex cursor-pointer items-center gap-2 transition-opacity duration-200 hover:opacity-90"
          >
            <div className="flex size-9 items-center justify-center rounded-full bg-primary text-white shadow-sm">
              <Zap className="size-4" aria-hidden />
            </div>
            <p className="text-xl font-semibold text-gray-900">Avla</p>
          </Link>
          <p className="font-medium leading-relaxed tracking-tight text-gray-600">
            Platform SaaS profesional untuk layanan teknologi informasi terkelola
            dan AI Video Assessment — dirancang untuk organisasi modern.
          </p>
          <div className="flex flex-wrap items-center gap-2">
            {complianceBadges.map((badge) => (
              <span
                key={badge}
                className="inline-flex items-center gap-1 rounded-full border border-blue-200 bg-white px-3 py-1 text-xs font-medium text-gray-700 shadow-sm"
              >
                <Shield className="size-3 text-primary" aria-hidden />
                {badge}
              </span>
            ))}
          </div>
        </div>

        <div className="pt-6 md:w-1/2 md:pt-0">
          <div className="flex flex-col items-start justify-start gap-y-8 md:flex-row md:items-start md:justify-between lg:pl-10">
            {footerLinks.map((column) => (
              <ul key={column.title} className="flex flex-col gap-y-2">
                <li className="mb-2 text-sm font-semibold text-primary">
                  {column.title}
                </li>
                {column.links.map((link) => (
                  <FooterLink key={link.id} href={link.url} title={link.title} />
                ))}
              </ul>
            ))}
          </div>
        </div>
      </div>

      <div className="border-t border-blue-100/80 px-6 py-4">
        <p className="mx-auto max-w-6xl text-center text-xs text-gray-500 md:text-left">
          © {new Date().getFullYear()} Avla System. All rights reserved.
        </p>
      </div>

    </footer>
  )
}

export default FlickeringFooter
