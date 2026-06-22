export interface InvoiceDetails {
  transaction_id: string
  course_name: string
  base_price: number
  admin_fee: number
  total_amount: number
  status: string
  snap_token: string | null
  payment_url?: string | null
}
