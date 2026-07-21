import type { CSSProperties, ReactNode } from "react"

import { cn } from "@/lib/utils"

type GradientVariant = "hero-bottom" | "hero-top" | "hero-center"

const gradientStyles: Record<GradientVariant, CSSProperties["background"]> = {
  /** Blue glow from bottom — ideal for hero sections */
  "hero-bottom":
    "radial-gradient(125% 125% at 50% 90%, #EFF6FF 40%, #3B82F6 100%)",
  /** Blue glow from top */
  "hero-top":
    "radial-gradient(125% 125% at 50% 10%, #ffffff 40%, #3B82F6 100%)",
  /** Soft centered wash */
  "hero-center":
    "radial-gradient(125% 125% at 50% 50%, #EFF6FF 45%, #93C5FD 100%)",
}

export interface RadialGradientBackgroundProps {
  variant?: GradientVariant
  className?: string
  style?: CSSProperties
}

/** Absolute radial gradient layer for hero / landing sections */
export function RadialGradientBackground({
  variant = "hero-bottom",
  className,
  style,
}: RadialGradientBackgroundProps) {
  return (
    <div
      aria-hidden
      className={cn(
        "pointer-events-none absolute inset-0 z-0",
        className
      )}
      style={{
        background: gradientStyles[variant],
        ...style,
      }}
    />
  )
}

export interface GradientBackgroundProps {
  variant?: GradientVariant
  className?: string
  children?: ReactNode
}

/** Full-area wrapper with radial gradient behind children */
export function GradientBackground({
  variant = "hero-bottom",
  className,
  children,
}: GradientBackgroundProps) {
  return (
    <div className={cn("relative min-h-full w-full", className)}>
      <RadialGradientBackground variant={variant} />
      <div className="relative z-10">{children}</div>
    </div>
  )
}

export default GradientBackground
