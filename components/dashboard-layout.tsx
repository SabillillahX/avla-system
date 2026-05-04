"use client"

import type React from "react"
import { useState } from "react"
import { useRouter, usePathname } from "next/navigation"
import { useAuth } from "@/contexts/AuthContext"
import { useNotification } from "@/components/notification"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { ThemeToggle } from "@/components/theme-toggle"
import { people } from "@/lib/people"
import {
  Search, Plus, Bell, ChevronDown, BarChart3, MessageSquare, FileText,
  Receipt, Settings, HelpCircle, User, LogOut, Folder,
  LayoutTemplateIcon as Template, Import, CheckCircle, Users, Menu,
  Loader2, CheckCircle2, AlertCircle,
} from "lucide-react"

interface DashboardLayoutProps {
  children: React.ReactNode
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const router = useRouter()
  const pathname = usePathname()
  const { user, logout } = useAuth()
  const { aiProcessState, aiProgress, aiStatusMessage } = useNotification()

  const currentUser = user || people.find((p) => p.id === "people_11") || people[11]

  const sidebarItems = [
    { name: "Dashboard", icon: BarChart3, path: "/dashboard" },
    { name: "My Video", icon: FileText, path: "/my-video" },
    { name: "Courses", icon: CheckCircle, path: "/courses" },
    { name: "My Course", icon: Users, path: "/my-course" },
    { name: "Chats", icon: MessageSquare, path: "/chats" },
    { name: "Documents", icon: FileText, path: "/documents" },
    { name: "Receipts", icon: Receipt, path: "/receipts" },
  ]

  const notifications = [
    { id: 1, title: "New task assigned", message: `${people[0].name} assigned you to 'Help DStudio get more customers'`, time: "2 minutes ago", unread: true },
    { id: 2, title: "Meeting reminder", message: "Kickoff Meeting starts in 30 minutes", time: "28 minutes ago", unread: true },
    { id: 3, title: "Task completed", message: `${people[2].name} completed 'Return a package'`, time: "1 hour ago", unread: false },
    { id: 4, title: "Comment added", message: `${people[1].name} commented on 'Plan a trip'`, time: "2 hours ago", unread: false },
  ]

  const sidebarContent = (
    <>
      <div className="p-6">
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">AvlaSystem</h1>
      </div>

      <nav className="flex-1 px-4 overflow-y-auto">
        {sidebarItems.map((item) => (
          <button
            key={item.name}
            onClick={() => router.push(item.path)}
            className={`w-full flex items-center px-3 py-2 mb-1 text-sm font-medium rounded-lg transition-colors ${pathname === item.path
              ? "bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300"
              : "text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
              }`}
          >
            <item.icon className="w-4 h-4 mr-3" />
            {item.name}
          </button>
        ))}
      </nav>

      <div className="p-4 border-t border-gray-200 dark:border-gray-700">


        <div className="space-y-2">
          <button className="w-full flex items-center px-3 py-2 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
            <Settings className="w-4 h-4 mr-3" />
            Settings
          </button>
          <button className="w-full flex items-center px-3 py-2 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
            <HelpCircle className="w-4 h-4 mr-3" />
            Help & Support
            <Badge variant="secondary" className="ml-auto bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-300">8</Badge>
          </button>
        </div>
      </div>
    </>
  )

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900 overflow-hidden">
      {/* Desktop Sidebar */}
      <div className="hidden lg:flex w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex-col">
        {sidebarContent}
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header */}
        <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 md:px-6 py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center space-x-2 md:space-x-4 flex-1">
              {/* Mobile Menu */}
              <div className="lg:hidden">
                <Sheet>
                  <SheetTrigger asChild>
                    <Button variant="ghost" size="icon" className="md:mr-2">
                      <Menu className="h-5 w-5" />
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="left" className="w-[280px] sm:w-[320px] p-0 flex flex-col border-none">
                    <SheetTitle className="sr-only">Menu navigasi aplikasi</SheetTitle>
                    {sidebarContent}
                  </SheetContent>
                </Sheet>
              </div>
            </div>

            <div className="flex items-center space-x-2 md:space-x-4">
              <ThemeToggle />

              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="ghost" size="icon" className="relative">
                    <Bell className="w-4 h-4" />
                    <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700" align="end">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold text-gray-900 dark:text-white">Notifications</h3>
                      <Button variant="ghost" size="sm" className="text-gray-600 dark:text-gray-300">Mark all as read</Button>
                    </div>
                    <Separator className="bg-gray-200 dark:bg-gray-700" />
                    <div className="space-y-3 max-h-80 overflow-y-auto">
                      {notifications.map((notification) => (
                        <div key={notification.id} className={`p-3 rounded-lg ${notification.unread ? "bg-blue-50 dark:bg-blue-900/20" : "bg-gray-50 dark:bg-gray-700"}`}>
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <p className="text-sm font-medium text-gray-900 dark:text-white">{notification.title}</p>
                              <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">{notification.message}</p>
                              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">{notification.time}</p>
                            </div>
                            {notification.unread && <div className="w-2 h-2 bg-blue-500 rounded-full mt-1" />}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </PopoverContent>
              </Popover>

              <Popover>
                <PopoverTrigger asChild>
                  <Avatar className="w-8 h-8 cursor-pointer">
                    <AvatarImage src={currentUser.imageURL || "/placeholder.svg"} />
                    <AvatarFallback className="bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white">
                      {currentUser.name.split(" ").map((n) => n[0]).join("")}
                    </AvatarFallback>
                  </Avatar>
                </PopoverTrigger>
                <PopoverContent className="w-64 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700" align="end">
                  <div className="space-y-4">
                    <div className="flex items-center space-x-3">
                      <Avatar className="w-12 h-12">
                        <AvatarImage src={currentUser.imageURL || "/placeholder.svg"} />
                        <AvatarFallback className="bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white">
                          {currentUser.name.split(" ").map((n) => n[0]).join("")}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-semibold text-gray-900 dark:text-white">{currentUser.name}</p>
                        <p className="text-sm text-gray-600 dark:text-gray-300">{currentUser.email}</p>
                      </div>
                    </div>
                    <Separator className="bg-gray-200 dark:bg-gray-700" />
                    <div className="space-y-2">
                      <Button variant="ghost" className="w-full justify-start text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700">
                        <User className="w-4 h-4 mr-2" /> Profile Settings
                      </Button>
                      <Button variant="ghost" className="w-full justify-start text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700">
                        <Settings className="w-4 h-4 mr-2" /> Account Settings
                      </Button>
                      <Button variant="ghost" className="w-full justify-start text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700">
                        <HelpCircle className="w-4 h-4 mr-2" /> Help & Support
                      </Button>
                    </div>
                    <Separator className="bg-gray-200 dark:bg-gray-700" />
                    <Button
                      variant="ghost"
                      onClick={() => logout()}
                      className="w-full justify-start text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20"
                    >
                      <LogOut className="w-4 h-4 mr-2" /> Sign Out
                    </Button>
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <div className="flex-1 overflow-auto bg-gray-50 dark:bg-gray-900">{children}</div>
      </div>

      {/* AI Process Overlay */}
      {aiProcessState !== "idle" && (
        <div className="fixed bottom-6 right-6 z-50 animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className="w-[380px] max-w-[calc(100vw-2rem)] bg-white/95 dark:bg-gray-800/95 backdrop-blur-xl shadow-2xl border border-gray-200 dark:border-gray-700 rounded-2xl p-5">
            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">AI Quiz Upload</p>

            {(aiProcessState === "connecting" || aiProcessState === "generating") && (
              <div className="mt-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm text-blue-700 dark:text-blue-300">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>{aiStatusMessage || "Memproses..."}</span>
                  </div>
                  <span className="text-sm font-semibold text-gray-800 dark:text-gray-100">
                    {Math.max(0, Math.min(100, aiProgress))}%
                  </span>
                </div>
                <Progress value={Math.max(0, Math.min(100, aiProgress))} className="h-2" />
              </div>
            )}

            {aiProcessState === "success" && (
              <div className="mt-4 flex items-center gap-2 text-green-700 dark:text-green-300">
                <CheckCircle2 className="w-5 h-5" />
                <span className="text-sm font-semibold">{aiStatusMessage || "Berhasil"}</span>
              </div>
            )}

            {aiProcessState === "error" && (
              <div className="mt-4 space-y-1">
                <div className="flex items-center gap-2 text-red-700 dark:text-red-300">
                  <AlertCircle className="w-5 h-5" />
                  <span className="text-sm font-semibold">Gagal upload</span>
                </div>
                <p className="text-xs text-red-700/90 dark:text-red-200/90">
                  {aiStatusMessage || "Terjadi kesalahan."}
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}