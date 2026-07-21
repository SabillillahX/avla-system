"use client"

import { Children, type ReactNode } from "react"
import {
  motion,
  useReducedMotion,
  type Variants,
} from "motion/react"

import { cn } from "@/lib/utils"

type PresetType =
  | "fade"
  | "slide"
  | "scale"
  | "blur"
  | "blur-slide"
  | "zoom"
  | "flip"
  | "bounce"
  | "rotate"
  | "swing"

type AnimatedGroupProps = {
  children: ReactNode
  className?: string
  variants?: {
    container?: Variants
    item?: Variants
  }
  preset?: PresetType
  /** When true, animates on mount (for above-the-fold hero). Default: in-view. */
  immediate?: boolean
}

const defaultContainerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
    },
  },
}

const defaultItemVariants: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
}

const presetVariants: Record<
  PresetType,
  { container: Variants; item: Variants }
> = {
  fade: {
    container: defaultContainerVariants,
    item: {
      hidden: { opacity: 0 },
      visible: { opacity: 1 },
    },
  },
  slide: {
    container: defaultContainerVariants,
    item: {
      hidden: { opacity: 0, y: 12 },
      visible: {
        opacity: 1,
        y: 0,
        transition: { duration: 0.4, ease: "easeOut" },
      },
    },
  },
  scale: {
    container: defaultContainerVariants,
    item: {
      hidden: { opacity: 0, scale: 0.96 },
      visible: {
        opacity: 1,
        scale: 1,
        transition: { duration: 0.35, ease: "easeOut" },
      },
    },
  },
  blur: {
    container: defaultContainerVariants,
    item: {
      hidden: { opacity: 0 },
      visible: {
        opacity: 1,
        transition: { duration: 0.4, ease: "easeOut" },
      },
    },
  },
  "blur-slide": {
    container: defaultContainerVariants,
    item: {
      hidden: { opacity: 0, y: 12 },
      visible: {
        opacity: 1,
        y: 0,
        transition: { duration: 0.4, ease: "easeOut" },
      },
    },
  },
  zoom: {
    container: defaultContainerVariants,
    item: {
      hidden: { opacity: 0, scale: 0.95 },
      visible: {
        opacity: 1,
        scale: 1,
        transition: { duration: 0.35, ease: "easeOut" },
      },
    },
  },
  flip: {
    container: defaultContainerVariants,
    item: {
      hidden: { opacity: 0 },
      visible: { opacity: 1, transition: { duration: 0.35 } },
    },
  },
  bounce: {
    container: defaultContainerVariants,
    item: {
      hidden: { opacity: 0, y: 8 },
      visible: {
        opacity: 1,
        y: 0,
        transition: { duration: 0.4, ease: "easeOut" },
      },
    },
  },
  rotate: {
    container: defaultContainerVariants,
    item: {
      hidden: { opacity: 0 },
      visible: { opacity: 1, transition: { duration: 0.35 } },
    },
  },
  swing: {
    container: defaultContainerVariants,
    item: {
      hidden: { opacity: 0 },
      visible: { opacity: 1, transition: { duration: 0.35 } },
    },
  },
}

function AnimatedGroup({
  children,
  className,
  variants,
  preset = "slide",
  immediate = false,
}: AnimatedGroupProps) {
  const reduceMotion = useReducedMotion()
  const selectedVariants = preset
    ? presetVariants[preset]
    : { container: defaultContainerVariants, item: defaultItemVariants }
  const containerVariants = variants?.container || selectedVariants.container
  const itemVariants = variants?.item || selectedVariants.item

  if (reduceMotion) {
    return <div className={cn(className)}>{children}</div>
  }

  return (
    <motion.div
      initial="hidden"
      animate={immediate ? "visible" : undefined}
      whileInView={immediate ? undefined : "visible"}
      viewport={immediate ? undefined : { once: true, margin: "-40px" }}
      variants={containerVariants}
      className={cn(className)}
    >
      {Children.map(children, (child, index) => (
        <motion.div key={index} variants={itemVariants}>
          {child}
        </motion.div>
      ))}
    </motion.div>
  )
}

export { AnimatedGroup }
