import type { DateLike } from '~~/types/events'

export interface AdminTransactionSeatInfo {
  label: string
  section: string | null
  row: string | null
  seat: string | null
  quantity: number
}

export interface AdminTransactionRow {
  id: number
  orderId: string
  eventTitle: string
  buyerName: string | null
  buyerEmail: string | null
  buyerPhone: string | null
  seats: AdminTransactionSeatInfo[]
  totalAmountCents: number
  currency: string
  paymentTime: DateLike | null
  status: string
  createdAt: DateLike
}
