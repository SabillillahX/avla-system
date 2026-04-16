"use client"

import type React from "react"
import { useState } from "react"
import { usePathname } from "next/navigation"
import DashboardLayout from "@/components/dashboard-layout"

interface Project {
  id: string
  name: string
  color: string
}

interface Note {
  id: string
  title: string
  description: string
  completed: boolean
}

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const [projects, setProjects] = useState<Project[]>([
    { id: "1", name: "Event Planning", color: "bg-pink-200" },
    { id: "2", name: "Breakfast Plan", color: "bg-green-200" },
  ])

  const handleAddProject = (project: Omit<Project, "id">) => {
    const newProject = {
      ...project,
      id: Date.now().toString(),
    }
    setProjects([...projects, newProject])
  }

  // Jangan tampilkan DashboardLayout untuk halaman auth
  const isAuthPage = pathname?.startsWith('/auth')
  const isLandingPage = pathname === '/'

  if (isAuthPage || isLandingPage) {
    return <>{children}</>
  }

  return (
    <DashboardLayout projects={projects} onAddProject={handleAddProject}>
      {children}
    </DashboardLayout>
  )
}
