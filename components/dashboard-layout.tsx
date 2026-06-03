"use client"

import type React from "react"
import Link from "next/link"
import Image from "next/image"
import { usePathname, useRouter } from "next/navigation"
import {
  motion,
  AnimatePresence,
  useReducedMotion,
  type Variants,
} from "motion/react"
import {
  AlertCircle,
  BarChart3,
  Bell,
  CheckCircle,
  CheckCircle2,
  FileText,
  HelpCircle,
  Loader2,
  LogOut,
  MessageSquare,
  Receipt,
  Settings,
  User,
  Users,
  Zap,
  ClipboardList,
} from "lucide-react"

import { useAuth } from "@/contexts/AuthContext"
import { useNotification } from "@/components/notification"
import { ThemeToggle } from "@/components/theme-toggle"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Separator } from "@/components/ui/separator"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
  SidebarSeparator,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar"
import { people } from "@/lib/people"
import { cn } from "@/lib/utils"

interface DashboardLayoutProps {
  children: React.ReactNode
}

const navItems = [
  { name: "My Video", icon: FileText, path: "/my-video" },
  { name: "Courses", icon: CheckCircle, path: "/courses", visibleFor: ["student", "admin"] },
  { name: "My Course", icon: Users, path: "/my-course", visibleFor: ["student", "admin"] },
  { name: "Chats", icon: MessageSquare, path: "/chats" },
  { name: "Group Chat", icon: Users, path: "/group-chat" },
  { name: "Documents", icon: FileText, path: "/documents" },
  { name: "Receipts", icon: Receipt, path: "/receipts" },
  { name: "Class Management", icon: ClipboardList, path: "/classes", visibleFor: ["teacher", "admin"] },
]

const notifications = [
  {
    id: 1,
    title: "New task assigned",
    message: `${people[0].name} assigned you to a new task`,
    time: "2 minutes ago",
    unread: true,
  },
  {
    id: 2,
    title: "Meeting reminder",
    message: "Kickoff Meeting starts in 30 minutes",
    time: "28 minutes ago",
    unread: true,
  },
  {
    id: 3,
    title: "Task completed",
    message: `${people[2].name} completed a package return`,
    time: "1 hour ago",
    unread: false,
  },
  {
    id: 4,
    title: "Comment added",
    message: `${people[1].name} commented on a plan`,
    time: "2 hours ago",
    unread: false,
  },
]

const navListVariants: Variants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.04, delayChildren: 0.08 },
  },
}

const navItemVariants: Variants = {
  hidden: { opacity: 0, x: -8 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.25, ease: "easeOut" as const },
  },
}

function NotificationsPopover() {
  const unreadCount = notifications.filter((n) => n.unread).length

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative h-9 w-9 text-gray-600 hover:bg-blue-100/80 hover:text-primary"
        >
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-red-500 ring-2 ring-white" />
          )}
          <span className="sr-only">Notifications</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[calc(100vw-2rem)] sm:w-80 border-blue-100 bg-white p-0 shadow-lg"
        align="end"
        side="bottom"
      >
        <div className="space-y-3 p-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-gray-900">Notifications</h3>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 text-xs text-primary hover:bg-blue-50"
            >
              Mark all read
            </Button>
          </div>
          <Separator className="bg-blue-100" />
          <div className="max-h-72 space-y-2 overflow-y-auto">
            {notifications.map((notification) => (
              <div
                key={notification.id}
                className={cn(
                  "rounded-lg p-3 transition-colors duration-200",
                  notification.unread ? "bg-blue-50" : "bg-gray-50/80"
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-900">
                      {notification.title}
                    </p>
                    <p className="mt-1 text-sm text-gray-600">
                      {notification.message}
                    </p>
                    <p className="mt-2 text-xs text-gray-500">
                      {notification.time}
                    </p>
                  </div>
                  {notification.unread && (
                    <div className="mt-1 h-2 w-2 shrink-0 rounded-full bg-primary" />
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}

type SidebarUser = {
  name: string
  email: string
  imageURL?: string
}

function DashboardSidebar({
  currentUser,
  userRoles,
  onLogout,
}: {
  currentUser: SidebarUser
  userRoles?: string[]
  onLogout: () => void
}) {
  const router = useRouter()
  const pathname = usePathname()
  const reduceMotion = useReducedMotion()
  const { setOpenMobile, isMobile } = useSidebar()

  const visibleNavItems = navItems.filter((item) => {
    if (!item.visibleFor || !userRoles || userRoles.length === 0) {
      return true
    }

    return item.visibleFor.some((role) => userRoles.includes(role))
  })

  const NavWrapper = reduceMotion ? "div" : motion.div

  return (
    <Sidebar
      collapsible="icon"
      className="border-blue-100/80 bg-sidebar"
    >
      <SidebarHeader className="border-b border-blue-100/80 p-3">
        <div className="flex flex-col gap-3 group-data-[collapsible=icon]:items-center">
          <Link
            href="/"
            className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 transition-colors duration-200 hover:bg-blue-100/60 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0"
          >
            <Image src="/logo-black.png" alt="Avla Logo" width={200} height={64} className="h-8 md:h-16 w-auto object-contain group-data-[collapsible=icon]:h-8 group-data-[collapsible=icon]:md:h-8 group-data-[collapsible=icon]:w-8 dark:hidden" />
            <Image src="/logo-white.png" alt="Avla Logo" width={200} height={64} className="h-8 md:h-16 w-auto object-contain group-data-[collapsible=icon]:h-8 group-data-[collapsible=icon]:md:h-8 group-data-[collapsible=icon]:w-8 hidden dark:block" />
          </Link>

          <div className="flex items-center justify-between gap-1 px-1 group-data-[collapsible=icon]:flex-col group-data-[collapsible=icon]:px-0">
            <NotificationsPopover />
            <ThemeToggle />
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent className="px-2 py-3">
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs font-medium uppercase tracking-wider text-gray-500">
            Menu
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <NavWrapper
                variants={reduceMotion ? undefined : navListVariants}
                initial={reduceMotion ? false : "hidden"}
                animate={reduceMotion ? undefined : "visible"}
                className="flex flex-col gap-0.5"
              >
                {visibleNavItems.map((item) => {
                  const isActive = pathname === item.path
                  const ItemWrapper = reduceMotion ? "div" : motion.div

                  return (
                    <SidebarMenuItem key={item.path}>
                      <ItemWrapper
                        variants={reduceMotion ? undefined : navItemVariants}
                      >
                        <SidebarMenuButton
                          isActive={isActive}
                          tooltip={item.name}
                          onClick={() => {
                            router.push(item.path)
                            if (isMobile) {
                              setOpenMobile(false)
                            }
                          }}
                          className={cn(
                            "cursor-pointer transition-colors duration-200",
                            "hover:bg-blue-100/70 hover:text-primary",
                            "data-[active=true]:bg-blue-100 data-[active=true]:font-medium data-[active=true]:text-primary",
                            "group-data-[collapsible=icon]:justify-center"
                          )}
                        >
                          <item.icon className="text-current" />
                          <span>{item.name}</span>
                        </SidebarMenuButton>
                      </ItemWrapper>
                    </SidebarMenuItem>
                  )
                })}
              </NavWrapper>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-blue-100/80 p-3">

        <SidebarSeparator className="my-3 bg-blue-100" />

        <Popover>
          <PopoverTrigger asChild>
            <button
              type="button"
              className="flex w-full cursor-pointer items-center gap-3 rounded-lg border border-blue-100/80 bg-white/80 p-2.5 text-left shadow-sm transition-all duration-200 hover:border-blue-200 hover:bg-white hover:shadow group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:p-2"
            >
              <Avatar className="h-9 w-9 shrink-0 ring-2 ring-blue-100">
                <AvatarImage src={currentUser.imageURL || ""} />
                <AvatarFallback className="bg-blue-100 text-sm font-bold text-primary">
                  {currentUser.name
                    ? currentUser.name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase()
                    : "U"}
                </AvatarFallback>
              </Avatar>
              <div className="flex min-w-0 flex-1 flex-col justify-center overflow-hidden group-data-[collapsible=icon]:hidden">
                <p className="truncate text-sm font-medium text-gray-900 leading-none mb-1">
                  {currentUser.name}
                </p>
                <p className="truncate text-xs text-gray-500 leading-none">
                  {currentUser.email}
                </p>
              </div>
            </button>
          </PopoverTrigger>
          <PopoverContent
            className="w-64 border-blue-100 bg-white shadow-lg"
            side="right"
            align="end"
          >
            <div className="space-y-3 p-1">
              <div className="flex items-center gap-3">
                <Avatar className="h-11 w-11">
                  <AvatarImage src={currentUser.imageURL || ""} />
                  <AvatarFallback className="bg-blue-100 font-bold text-primary">
                    {currentUser.name
                      ? currentUser.name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase()
                      : "U"}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="font-semibold text-gray-900">{currentUser.name}</p>
                  <p className="truncate text-sm text-gray-600">
                    {currentUser.email}
                  </p>
                </div>
              </div>
              <Separator className="bg-blue-100" />
              <div className="space-y-1">
                <Button
                  variant="ghost"
                  className="w-full justify-start text-gray-700 hover:bg-blue-50 hover:text-primary"
                >
                  <User className="mr-2 h-4 w-4" />
                  Profile Settings
                </Button>
                <Button
                  variant="ghost"
                  className="w-full justify-start text-gray-700 hover:bg-blue-50 hover:text-primary"
                >
                  <Settings className="mr-2 h-4 w-4" />
                  Account Settings
                </Button>
              </div>
              <Separator className="bg-blue-100" />
              <Button
                variant="ghost"
                onClick={onLogout}
                className="w-full justify-start text-red-600 hover:bg-red-50 hover:text-red-700"
              >
                <LogOut className="mr-2 h-4 w-4" />
                Sign Out
              </Button>
            </div>
          </PopoverContent>
        </Popover>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  )
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const { user, logout } = useAuth()
  const { aiProcessState, aiProgress, aiStatusMessage } = useNotification()
  const reduceMotion = useReducedMotion()

  const fallbackPerson =
    people.find((p) => p.id === "people_11") ?? people[11]
  const currentUser: SidebarUser = user
    ? {
      name: user.name,
      email: user.email,
      imageURL: user.imageURL,
    }
    : {
      name: fallbackPerson.name,
      email: fallbackPerson.email,
      imageURL: fallbackPerson.imageURL,
    }

  return (
    <SidebarProvider defaultOpen>
      <div className="flex min-h-svh w-full bg-[#EFF6FF]">
        <DashboardSidebar
          currentUser={currentUser}
          userRoles={user?.roles}
          onLogout={() => logout()}
        />

        <SidebarInset className="bg-[#EFF6FF]">
          <div className="flex h-12 shrink-0 items-center gap-2 border-b border-blue-100/60 bg-white/60 px-4 backdrop-blur-sm md:hidden">
            <SidebarTrigger className="text-primary hover:bg-blue-100" />
            <span className="text-sm font-medium text-gray-700">Menu</span>
          </div>

          <main className="flex-1 overflow-auto">
            {children}
          </main>
        </SidebarInset>
      </div>

      <AnimatePresence>
        {aiProcessState !== "idle" && (
          <motion.div
            initial={reduceMotion ? false : { opacity: 0, y: 16, scale: 0.96 }}
            animate={reduceMotion ? undefined : { opacity: 1, y: 0, scale: 1 }}
            exit={reduceMotion ? undefined : { opacity: 0, y: 12, scale: 0.96 }}
            transition={{ duration: 0.28, ease: "easeOut" }}
            className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50"
          >
            <div className="w-[calc(100vw-2rem)] sm:w-[380px] max-w-[380px] rounded-2xl border border-blue-100 bg-white/95 p-4 sm:p-5 shadow-xl shadow-blue-900/10 backdrop-blur-xl">
              <p className="text-sm font-semibold text-gray-900">AI Quiz Upload</p>

              {(aiProcessState === "connecting" ||
                aiProcessState === "generating") && (
                  <div className="mt-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-sm text-primary">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>{aiStatusMessage || "Memproses..."}</span>
                      </div>
                      <span className="text-sm font-semibold text-gray-800">
                        {Math.max(0, Math.min(100, aiProgress))}%
                      </span>
                    </div>
                    <Progress
                      value={Math.max(0, Math.min(100, aiProgress))}
                      className="h-2"
                    />
                  </div>
                )}

              {aiProcessState === "success" && (
                <div className="mt-4 flex items-center gap-2 text-green-700">
                  <CheckCircle2 className="h-5 w-5" />
                  <span className="text-sm font-semibold">
                    {aiStatusMessage || "Berhasil"}
                  </span>
                </div>
              )}

              {aiProcessState === "error" && (
                <div className="mt-4 space-y-1">
                  <div className="flex items-center gap-2 text-red-700">
                    <AlertCircle className="h-5 w-5" />
                    <span className="text-sm font-semibold">Gagal upload</span>
                  </div>
                  <p className="text-xs text-red-600/90">
                    {aiStatusMessage || "Terjadi kesalahan."}
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </SidebarProvider>
  )
}
