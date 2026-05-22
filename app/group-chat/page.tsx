"use client"

import { useMemo, useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { ProtectedRoute } from "@/components/auth/ProtectedRoute"
import { courseCatalog } from "@/lib/mock-courses"
import { getJoinedCourseIds } from "@/lib/course-storage"
import { Search, Send } from "lucide-react"

type GroupMessage = {
  id: string
  sender: string
  content: string
  timestamp: string
}

type GroupChat = {
  id: string
  name: string
  members: number
  messages: GroupMessage[]
}

const seedMessages: GroupMessage[] = [
  {
    id: "msg-1",
    sender: "Instructor",
    content: "Selamat datang di kelas! Silakan perkenalkan diri ya.",
    timestamp: "09:00 AM",
  },
  {
    id: "msg-2",
    sender: "Mentor",
    content: "Materi minggu ini sudah di-update. Cek lesson terbaru ya!",
    timestamp: "09:20 AM",
  },
]

export default function GroupChatPage() {
  const [joinedIds, setJoinedIds] = useState<string[]>([])
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [draftMessage, setDraftMessage] = useState("")

  useEffect(() => {
    setJoinedIds(getJoinedCourseIds())
  }, [])

  const groupChats = useMemo<GroupChat[]>(() => {
    return courseCatalog
      .filter((course) => joinedIds.includes(course.id))
      .map((course) => ({
        id: `group-${course.id}`,
        name: `${course.title} Class`,
        members: 120 + course.lessons,
        messages: seedMessages,
      }))
  }, [joinedIds])

  const filteredChats = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()
    if (!query) return groupChats
    return groupChats.filter((chat) => chat.name.toLowerCase().includes(query))
  }, [groupChats, searchQuery])

  const activeChat = filteredChats.find((chat) => chat.id === selectedChatId) || filteredChats[0]

  const handleSend = () => {
    setDraftMessage("")
  }

  return (
    <ProtectedRoute>
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Group Chat</h1>
          <p className="text-gray-600 dark:text-gray-400">Diskusi otomatis muncul saat kamu join kelas.</p>
        </div>

        {groupChats.length === 0 ? (
          <div className="rounded-lg border border-dashed border-gray-300 dark:border-gray-700 p-10 text-center text-gray-500 dark:text-gray-400">
            Belum ada group chat. Join course dulu supaya masuk ke grup kelas.
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-6">
            <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search group..."
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  className="pl-9"
                />
              </div>
              <div className="space-y-2">
                {filteredChats.map((chat) => (
                  <button
                    key={chat.id}
                    onClick={() => setSelectedChatId(chat.id)}
                    className={`w-full rounded-lg border px-3 py-2 text-left transition ${
                      chat.id === (selectedChatId || activeChat?.id)
                        ? "border-blue-200 bg-blue-50"
                        : "border-transparent hover:border-blue-100 hover:bg-blue-50/70"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarFallback className="bg-blue-100 text-sm font-semibold text-blue-700">
                          {chat.name
                            .split(" ")
                            .slice(0, 2)
                            .map((word) => word[0])
                            .join("")}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-gray-900 dark:text-white">{chat.name}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{chat.members} members</p>
                      </div>
                      <Badge variant="secondary" className="text-[11px]">Class</Badge>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {activeChat && (
              <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 flex flex-col">
                <div className="border-b border-gray-200 dark:border-gray-700 px-5 py-4">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{activeChat.name}</h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{activeChat.members} members</p>
                </div>

                <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
                  {activeChat.messages.map((message) => (
                    <div key={message.id} className="space-y-1">
                      <p className="text-xs text-gray-500 dark:text-gray-400">{message.sender}</p>
                      <div className="rounded-lg bg-gray-100 dark:bg-gray-700 px-3 py-2 text-sm text-gray-700 dark:text-gray-200">
                        {message.content}
                      </div>
                      <span className="text-xs text-gray-400">{message.timestamp}</span>
                    </div>
                  ))}
                </div>

                <div className="border-t border-gray-200 dark:border-gray-700 px-5 py-4">
                  <div className="flex items-center gap-2">
                    <Input
                      placeholder="Type a message..."
                      value={draftMessage}
                      onChange={(event) => setDraftMessage(event.target.value)}
                    />
                    <Button onClick={handleSend} className="gap-2">
                      <Send className="h-4 w-4" />
                      Send
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </ProtectedRoute>
  )
}
