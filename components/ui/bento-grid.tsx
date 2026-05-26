import { type ComponentPropsWithoutRef, type ReactNode } from "react"
import Link from "next/link"
import { ArrowRight } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

interface BentoGridProps extends ComponentPropsWithoutRef<"div"> {
  children: ReactNode
  className?: string
}

interface BentoCardProps extends ComponentPropsWithoutRef<"div"> {
  name: string
  className: string
  background: ReactNode
  Icon: React.ElementType
  description: string
  href: string
  cta: string
}

const BentoGrid = ({ children, className, ...props }: BentoGridProps) => {
  return (
    <div
      className={cn(
        "grid w-full auto-rows-[22rem] grid-cols-1 sm:grid-cols-3 gap-4",
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

const BentoCard = ({
  name,
  className,
  background,
  Icon,
  description,
  href,
  cta,
  ...props
}: BentoCardProps) => (
  <div
    className={cn(
      "group relative col-span-3 flex flex-col justify-between overflow-hidden rounded-xl",
      "border border-blue-100 bg-white shadow-sm",
      "transition-shadow duration-200 hover:border-blue-200 hover:shadow-md",
      className
    )}
    {...props}
  >
    <div>{background}</div>
    <div className="p-4">
      <div className="pointer-events-none z-10 flex transform-gpu flex-col gap-1 transition-all duration-300 lg:group-hover:-translate-y-10">
        <Icon className="h-10 w-10 origin-left text-primary transition-all duration-300 ease-in-out group-hover:scale-90" />
        <h3 className="text-xl font-semibold text-gray-900">{name}</h3>
        <p className="max-w-lg text-sm leading-relaxed text-gray-600">
          {description}
        </p>
      </div>

      <div className="pointer-events-none flex w-full translate-y-0 transform-gpu flex-row items-center transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100 lg:hidden">
        <Button
          variant="link"
          asChild
          size="sm"
          className="pointer-events-auto p-0 text-primary"
        >
          <Link href={href}>
            {cta}
            <ArrowRight className="ms-2 h-4 w-4" />
          </Link>
        </Button>
      </div>
    </div>

    <div className="pointer-events-none absolute bottom-0 hidden w-full translate-y-10 transform-gpu flex-row items-center p-4 opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100 lg:flex">
      <Button
        variant="link"
        asChild
        size="sm"
        className="pointer-events-auto p-0 text-pink-600"
      >
        <Link href={href}>
          {cta}
          <ArrowRight className="ms-2 h-4 w-4" />
        </Link>
      </Button>
    </div>

    <div className="pointer-events-none absolute inset-0 transition-colors duration-300 group-hover:bg-blue-50/40" />
  </div>
)

export { BentoCard, BentoGrid }
