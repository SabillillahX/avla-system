export type BatchStatus = "upcoming" | "active" | "expired" | "closed"

export interface CourseBatch {
  id: string
  course_id: string
  name: string
  start_date: string
  start_time: string | null
  end_date: string
  end_time: string | null
  status: BatchStatus
  max_students: number | null
  enrolled_count: number
  created_at: string
  updated_at: string
}

export interface CreateBatchPayload {
  name: string
  start_date: string
  start_time?: string | null
  end_date: string
  end_time?: string | null
  max_students?: number | null
}

export interface UpdateBatchPayload extends Partial<CreateBatchPayload> {}
