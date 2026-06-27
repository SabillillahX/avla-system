import type { CourseClass } from "@/lib/api/classes"

export function buildCertificateId(courseId: string, userId: string): string {
  const clean = (value: string) => value.replace(/[^a-zA-Z0-9]/g, "").toUpperCase()
  const course = clean(courseId).slice(0, 8).padEnd(8, "0")
  const user = clean(userId).slice(0, 4).padEnd(4, "0")
  return `UC-${course}-${user}`
}

export function countLectures(course: Pick<CourseClass, "sections">): number {
  return (course.sections || []).reduce((total, section) => total + (section.videos?.length || 0), 0)
}
