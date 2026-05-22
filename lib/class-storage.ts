export type ClassStatus = "draft" | "published"

export type ClassItem = {
  id: string
  title: string
  category: string
  price: string
  level: string
  imageUrl: string
  description: string
  status: ClassStatus
  students: number
  updatedAt: string
}

const STORAGE_KEY = "class_management_items"

const defaultClasses: ClassItem[] = [
  {
    id: "class-1",
    title: "AI Engineer Agentic Track",
    category: "AI Engineering",
    price: "Rp129,000",
    level: "Intermediate",
    imageUrl: "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?q=80&w=1200&auto=format&fit=crop",
    description: "Build agent workflows with practical MCP projects.",
    status: "published",
    students: 1280,
    updatedAt: "May 18, 2026",
  },
  {
    id: "class-2",
    title: "Generative AI for Beginners",
    category: "AI Basics",
    price: "Rp109,000",
    level: "Beginner",
    imageUrl: "https://images.unsplash.com/photo-1487058792275-0ad4aaf24ca7?q=80&w=1200&auto=format&fit=crop",
    description: "Start from zero and build confidence with prompts and projects.",
    status: "draft",
    students: 540,
    updatedAt: "May 12, 2026",
  },
]

const safeParse = (value: string | null): ClassItem[] => {
  if (!value) return defaultClasses
  try {
    const parsed = JSON.parse(value)
    if (!Array.isArray(parsed)) return defaultClasses
    return parsed as ClassItem[]
  } catch {
    return defaultClasses
  }
}

export const getStoredClasses = (): ClassItem[] => {
  if (typeof window === "undefined") return defaultClasses
  return safeParse(window.localStorage.getItem(STORAGE_KEY))
}

export const saveClasses = (items: ClassItem[]) => {
  if (typeof window === "undefined") return
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
}

export const getClassById = (id: string): ClassItem | null => {
  return getStoredClasses().find((item) => item.id === id) || null
}

export const addClass = (item: ClassItem) => {
  const next = [item, ...getStoredClasses()]
  saveClasses(next)
  return next
}

export const updateClass = (id: string, patch: Partial<ClassItem>) => {
  const next = getStoredClasses().map((item) =>
    item.id === id ? { ...item, ...patch } : item
  )
  saveClasses(next)
  return next
}

export const removeClass = (id: string) => {
  const next = getStoredClasses().filter((item) => item.id !== id)
  saveClasses(next)
  return next
}
