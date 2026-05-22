const STORAGE_KEY = "joined_course_ids"

const safeJsonParse = (value: string | null): string[] => {
  if (!value) return []
  try {
    const parsed = JSON.parse(value)
    return Array.isArray(parsed) ? parsed.filter((id) => typeof id === "string") : []
  } catch {
    return []
  }
}

export const getJoinedCourseIds = (): string[] => {
  if (typeof window === "undefined") return []
  return safeJsonParse(window.localStorage.getItem(STORAGE_KEY))
}

const persistIds = (ids: string[]) => {
  if (typeof window === "undefined") return
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(ids))
}

export const isCourseJoined = (courseId: string): boolean => {
  return getJoinedCourseIds().includes(courseId)
}

export const joinCourse = (courseId: string): string[] => {
  const ids = new Set(getJoinedCourseIds())
  ids.add(courseId)
  const result = Array.from(ids)
  persistIds(result)
  return result
}

export const leaveCourse = (courseId: string): string[] => {
  const ids = new Set(getJoinedCourseIds())
  ids.delete(courseId)
  const result = Array.from(ids)
  persistIds(result)
  return result
}
