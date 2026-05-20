"use client"

import type React from "react"
  import { usePathname } from "next/navigation"
import DashboardLayout from "@/components/dashboard-layout"

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()

  const isAuthPage = pathname?.startsWith("/auth")
  const isLandingPage = pathname === "/"

  if (isAuthPage || isLandingPage) {
    return <>{children}</>
  }

  return <DashboardLayout>{children}</DashboardLayout>
}
