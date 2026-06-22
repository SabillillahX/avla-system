import { CourseClass } from "@/lib/api/classes"

export interface FormState {
  title: string
  category: string
  price: string
  discount_price: string
  is_free: boolean
  short_description: string
  description: string
  language: string
  has_certificate: boolean
  what_you_will_learn: string[]
  requirements: string[]
}

export type ClassRow = {
  id: string
  title: string
  category: string
  price: string
  imageUrl: string
  description: string
  status: "published" | "draft" | "archived"
  students: number
  updatedAt: string
  raw: CourseClass
}