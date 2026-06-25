"use client"

import { useEffect, useMemo, useState } from "react"
import { ProtectedRoute } from "@/components/auth/ProtectedRoute"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useAuth } from "@/contexts/AuthContext"
import { type ClassChatMessage } from "@/lib/api/chat"
import { type CourseClass } from "@/lib/api/classes"
import { Paperclip, Image as ImageIcon, Info, MessageCircle, MoreVertical, Phone, Search, Send, Video, ArrowLeft } from "lucide-react"

type Conversation = {
  id: string
  classId: string
  name: string
  preview: string
  time: string
  unread: number
  online: boolean
  members: number | null
  avatar?: string | null
}

const extractCourseArray = (value: unknown): CourseClass[] => {
  if (Array.isArray(value)) {
    return value as CourseClass[]
  }

  if (value && typeof value === "object" && "data" in value && Array.isArray((value as { data?: unknown }).data)) {
    return (value as { data: CourseClass[] }).data
  }

  return []
}

const extractMessageArray = (value: unknown): ClassChatMessage[] => {
  if (Array.isArray(value)) {
    return value as ClassChatMessage[]
  }

  if (value && typeof value === "object" && "data" in value && Array.isArray((value as { data?: unknown }).data)) {
    return (value as { data: ClassChatMessage[] }).data
  }

  return []
}

const formatTime = (value?: string | null) => {
  if (!value) return ""

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ""

  return date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })
}

const getInitials = (name: string) =>
  name
    .split(" ")
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase()

const backendBaseUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000/api"

export default function GroupChatPage() {
  const { user, isLoading } = useAuth()
  const [classes, setClasses] = useState<CourseClass[]>([])
  const [selectedChatId, setSelectedChatId] = useState<string>("")
  const [searchQuery, setSearchQuery] = useState("")
  const [draftMessage, setDraftMessage] = useState("")
  const [messages, setMessages] = useState<ClassChatMessage[]>([])
  const [isLoadingChats, setIsLoadingChats] = useState(true)
  const [isLoadingMessages, setIsLoadingMessages] = useState(false)
  const [showMobileChat, setShowMobileChat] = useState(false)

  useEffect(() => {
    const loadClasses = async () => {
      if (isLoading) return

      if (!user) {
        setClasses([])
        setSelectedChatId("")
        setIsLoadingChats(false)
        return
      }

      setIsLoadingChats(true)

      try {
        let result: CourseClass[] = []
        const token = typeof window !== "undefined" ? localStorage.getItem("auth_token") : null

        if (user.roles?.includes("student")) {
          const response = await fetch(`${backendBaseUrl}/courses/enrolled`, {
            headers: {
              Accept: "application/json",
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
          })

          if (!response.ok) {
            throw new Error(`Failed to load enrolled classes: ${response.status}`)
          }

          const payload = await response.json()
          result = extractCourseArray(payload?.data)
        } else {
          const response = await fetch(`${backendBaseUrl}/courses`, {
            headers: {
              Accept: "application/json",
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
          })

          if (!response.ok) {
            throw new Error(`Failed to load classes: ${response.status}`)
          }

          const payload = await response.json()
          const allClasses = extractCourseArray(payload?.data)
          result = user.roles?.includes("teacher")
            ? allClasses.filter((course) => course.teacher?.id === user.id)
            : allClasses
        }

        setClasses(result)
        setSelectedChatId((current) => current || result[0]?.id || "")
      } catch (error) {
        console.error("Failed to load group chats", error)
        setClasses([])
        setSelectedChatId("")
      } finally {
        setIsLoadingChats(false)
      }
    }

    loadClasses()
  }, [isLoading, user])

  const conversations = useMemo<Conversation[]>(() => {
    return classes.map((course) => ({
      id: course.id,
      classId: course.id,
      name: `${course.name} Class`,
      preview: course.short_description || course.description || "Join the class to start chatting.",
      time: formatTime(course.updated_at) || "Now",
      unread: 0,
      online: true,
      members: null,
      avatar: course.thumbnail_url || null,
    }))
  }, [classes])

  const filteredConversations = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()
    if (!query) return conversations
    return conversations.filter((conversation) => conversation.name.toLowerCase().includes(query))
  }, [conversations, searchQuery])

  const activeConversation = useMemo(() => {
    if (!filteredConversations.length) return null

    return filteredConversations.find((conversation) => conversation.id === selectedChatId) || filteredConversations[0]
  }, [filteredConversations, selectedChatId])

  useEffect(() => {
    if (!activeConversation) {
      setMessages([])
      setIsLoadingMessages(false)
      return
    }

    let isMounted = true
    setMessages([])

    const loadMessages = async (showLoading: boolean) => {
      if (showLoading) {
        setIsLoadingMessages(true)
      }

      try {
        const token = typeof window !== "undefined" ? localStorage.getItem("auth_token") : null
        const response = await fetch(`${backendBaseUrl}/courses/${activeConversation.classId}/chat/messages`, {
          headers: {
            Accept: "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        })

        if (!response.ok) {
          throw new Error(`Failed to load class chat messages: ${response.status}`)
        }

        const payload = await response.json()
        const list = extractMessageArray(payload?.data)
        if (!isMounted) return
        setMessages(list.slice().reverse())
      } catch (error) {
        console.error("Failed to load class chat messages", error)
        if (isMounted) {
          setMessages([])
        }
      } finally {
        if (isMounted && showLoading) {
          setIsLoadingMessages(false)
        }
      }
    }

    loadMessages(true)
    const interval = window.setInterval(() => {
      loadMessages(false)
    }, 5000)

    return () => {
      isMounted = false
      window.clearInterval(interval)
    }
  }, [activeConversation?.classId])

  const handleSend = async () => {
    if (!activeConversation || !draftMessage.trim()) return

    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("auth_token") : null
      const sendResponse = await fetch(`${backendBaseUrl}/courses/${activeConversation.classId}/chat/messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ message: draftMessage.trim() }),
      })

      if (!sendResponse.ok) {
        throw new Error(`Failed to send chat message: ${sendResponse.status}`)
      }

      setDraftMessage("")

      const response = await fetch(`${backendBaseUrl}/courses/${activeConversation.classId}/chat/messages`, {
        headers: {
          Accept: "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      })

      if (response.ok) {
        const payload = await response.json()
        setMessages(extractMessageArray(payload?.data).slice().reverse())
      }
    } catch (error) {
      console.error("Failed to send chat message", error)
    }
  }

  return (
    <ProtectedRoute>
      <div className="min-h-[calc(100vh-72px)] bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.10),_transparent_35%),linear-gradient(180deg,_#fafafa_0%,_#f3f6fb_100%)] p-0 sm:p-4 md:p-6">
        <div className="mx-auto flex h-[calc(100vh-72px)] sm:h-[calc(100vh-104px)] max-w-[1600px] overflow-hidden sm:rounded-[28px] border-0 sm:border border-slate-200/80 bg-white shadow-none sm:shadow-[0_20px_80px_rgba(15,23,42,0.08)]">
          <aside className={`flex w-full flex-col border-r border-slate-200 bg-white md:w-[340px] shrink-0 ${showMobileChat ? "hidden md:flex" : "flex"}`}>
            <div className="border-b border-slate-200 px-5 py-4">
              <h1 className="text-2xl font-semibold tracking-tight text-slate-950">Chats</h1>
              <div className="relative mt-4">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Search conversations..."
                  className="h-12 rounded-2xl border-slate-200 bg-slate-50 pl-10 text-sm"
                />
              </div>
            </div>

            <ScrollArea className="flex-1">
              <div className="divide-y divide-slate-100">
                {isLoadingChats ? (
                  <div className="px-5 py-6 text-sm text-slate-500">Loading class chats...</div>
                ) : filteredConversations.length === 0 ? (
                  <div className="px-5 py-6 text-sm text-slate-500">No class chats found.</div>
                ) : (
                  filteredConversations.map((conversation) => {
                    const isActive = conversation.id === activeConversation?.id

                    return (
                      <button
                        key={conversation.id}
                        onClick={() => {
                          setSelectedChatId(conversation.id)
                          setShowMobileChat(true)
                        }}
                        className={`flex w-full items-center gap-3 px-4 py-4 text-left transition ${
                          isActive ? "border-r-4 border-r-blue-500 bg-blue-50/70" : "hover:bg-slate-50"
                        }`}
                      >
                        <div className="relative">
                          <Avatar className="h-14 w-14 border border-white shadow-sm">
                            <AvatarImage src={conversation.avatar || undefined} alt={conversation.name} />
                            <AvatarFallback className="bg-gradient-to-br from-indigo-500 to-blue-500 text-sm font-semibold text-white">
                              {getInitials(conversation.name)}
                            </AvatarFallback>
                          </Avatar>
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <p className="truncate text-[15px] font-semibold text-slate-950">{conversation.name}</p>
                              <p className="mt-1 truncate text-sm text-slate-500">{conversation.preview}</p>
                            </div>
                            <div className="flex flex-col items-end gap-2">
                              <span className="text-xs text-slate-400">{conversation.time}</span>
                              {conversation.unread ? (
                                <span className="grid h-6 w-6 place-items-center rounded-full bg-blue-500 text-[11px] font-semibold text-white">
                                  {conversation.unread}
                                </span>
                              ) : null}
                            </div>
                          </div>
                          <div className="mt-2 flex items-center gap-2 text-xs text-slate-500">
                            <Badge variant="secondary" className="rounded-full bg-violet-100 text-violet-700 hover:bg-violet-100">
                              Class
                            </Badge>
                            {conversation.members !== null ? <span>{conversation.members} members</span> : <span>Join the class to chat</span>}
                          </div>
                        </div>
                      </button>
                    )
                  })
                )}
              </div>
            </ScrollArea>
          </aside>

          <section className={`flex min-w-0 flex-1 flex-col bg-slate-50 ${showMobileChat ? "flex" : "hidden md:flex"}`}>
            <header className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 sm:px-5 sm:py-4 md:px-6">
              <div className="flex items-center gap-3 sm:gap-4">
                <Button
                  variant="ghost"
                  size="icon"
                  className="md:hidden shrink-0 -ml-2"
                  onClick={() => setShowMobileChat(false)}
                >
                  <ArrowLeft className="h-5 w-5 text-slate-600" />
                </Button>
                <Avatar className="h-10 w-10 sm:h-12 sm:w-12 border border-white shadow-sm shrink-0">
                  <AvatarImage src={activeConversation?.avatar || undefined} alt={activeConversation?.name || "Conversation"} />
                  <AvatarFallback className="bg-gradient-to-br from-indigo-500 to-blue-500 text-sm font-semibold text-white">
                    {activeConversation ? getInitials(activeConversation.name) : "GC"}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h2 className="text-xl font-semibold text-slate-950">{activeConversation?.name || "Class Chat"}</h2>
                  <div className="mt-1 flex items-center gap-2 text-sm text-slate-500">
                    <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                    <span>{activeConversation ? "Online" : "No class selected"}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1 text-slate-500">
                <button className="grid h-8 w-8 sm:h-10 sm:w-10 place-items-center rounded-full transition hover:bg-slate-100" aria-label="Call">
                  <Phone className="h-4 w-4" />
                </button>
                <button className="grid h-8 w-8 sm:h-10 sm:w-10 place-items-center rounded-full transition hover:bg-slate-100" aria-label="Video call">
                  <Video className="h-4 w-4" />
                </button>
                <button className="hidden sm:grid h-10 w-10 place-items-center rounded-full transition hover:bg-slate-100" aria-label="Info">
                  <Info className="h-4 w-4" />
                </button>
                <button className="grid h-8 w-8 sm:h-10 sm:w-10 place-items-center rounded-full transition hover:bg-slate-100" aria-label="More">
                  <MoreVertical className="h-4 w-4" />
                </button>
              </div>
            </header>

            <ScrollArea className="flex-1">
              <div className="space-y-6 px-4 py-6 md:px-8 md:py-8">
                {isLoadingMessages ? (
                  <div className="text-sm text-slate-500">Loading messages...</div>
                ) : messages.length === 0 ? (
                  <div className="rounded-[22px] border border-dashed border-slate-300 bg-white px-6 py-10 text-sm text-slate-500 shadow-sm">
                    No messages yet. Start the conversation in this class chat.
                  </div>
                ) : (
                  messages.map((message) => {
                    const isRight = message.user?.id === user?.id

                    return (
                      <div key={message.id} className={`flex items-end gap-3 ${isRight ? "justify-end" : "justify-start"}`}>
                        {!isRight && (
                          <Avatar className="h-10 w-10">
                            <AvatarFallback className="bg-slate-200 text-xs font-semibold text-slate-700">
                              {getInitials(message.user?.name || "User")}
                            </AvatarFallback>
                          </Avatar>
                        )}

                        <div className={`max-w-[78%] ${isRight ? "items-end" : "items-start"} flex flex-col gap-1`}>
                          <div
                            className={`rounded-[22px] px-4 py-3 text-[15px] leading-6 shadow-sm ${
                              isRight ? "bg-blue-500 text-white" : "border border-slate-200 bg-white text-slate-900"
                            }`}
                          >
                            {message.message}
                          </div>

                          <div className={`text-xs text-slate-500 ${isRight ? "text-right" : "text-left"}`}>
                            {formatTime(message.created_at)} {message.user?.name ? `• ${message.user.name}` : ""}
                          </div>
                        </div>

                        {isRight && <div className="h-10 w-10" />}
                      </div>
                    )
                  })
                )}
              </div>
            </ScrollArea>

            <div className="border-t border-slate-200 bg-white px-3 py-3 sm:px-4 sm:py-4 md:px-6">
              <div className="flex items-end gap-2 sm:gap-3 rounded-[20px] border border-slate-200 bg-slate-50 px-2 py-2 sm:px-3 sm:py-3 shadow-sm">
                <button className="hidden sm:grid h-10 w-10 shrink-0 place-items-center rounded-full text-slate-500 transition hover:bg-white hover:text-slate-900" aria-label="Attach file">
                  <Paperclip className="h-5 w-5" />
                </button>
                <button className="grid h-9 w-9 sm:h-10 sm:w-10 shrink-0 place-items-center rounded-full text-slate-500 transition hover:bg-white hover:text-slate-900" aria-label="Attach image">
                  <ImageIcon className="h-4 w-4 sm:h-5 sm:w-5" />
                </button>
                <Input
                  value={draftMessage}
                  onChange={(event) => setDraftMessage(event.target.value)}
                  placeholder={activeConversation ? "Type a message..." : "Select a class chat first"}
                  disabled={!activeConversation}
                  className="h-9 sm:h-11 flex-1 rounded-2xl border-slate-200 bg-white px-3 sm:px-4 text-sm shadow-none"
                />
                <button className="hidden sm:grid h-10 w-10 shrink-0 place-items-center rounded-full text-slate-500 transition hover:bg-white hover:text-slate-900" aria-label="Emoji">
                  <MessageCircle className="h-5 w-5" />
                </button>
                <Button
                  className="h-9 w-9 sm:h-11 sm:w-auto rounded-2xl bg-blue-500 p-0 sm:px-4 text-white shadow-none hover:bg-blue-600 shrink-0"
                  onClick={handleSend}
                  disabled={!activeConversation || !draftMessage.trim()}
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
              <p className="mt-2 hidden sm:block text-xs text-slate-500">Chat class aktif dan tersambung ke backend. Hanya kelas yang sudah di-join yang bisa dibuka.</p>
            </div>
          </section>
        </div>
      </div>
    </ProtectedRoute>
  )
}