export interface Transaction {
  id: string
  course_id: string
  amount: number
  status: 'pending' | 'success' | 'failed' | 'expire' | 'cancel' | 'canceled'
  payment_url: string | null
  snap_token: string | null
  created_at: string
  course_class?: {
    name: string
    thumbnail_url: string | null
  }
}
