import type { DateLike } from '~~/types/events'

export interface AdminDashboardKpiSummary {
  totalRevenueCents: number
  totalSeatsListed: number
  soldSeatsCount: number
  ticketsIssuedCount: number
  totalViews: number
  occupancyRate: number
  activeEventsCount: number
  activeSessionsCount: number
  activeHoldsCount: number
  queueWaitingCount: number
}

export interface AdminDashboardChartPoint {
  label: string
  revenueCents: number
  ticketsSold: number
}

export interface AdminDashboardEventRow {
  id: number
  title: string
  status: string
  venueName: string
  venueCity: string
  startsAt: DateLike
  nextSessionAt: DateLike | null
  totalSeats: number
  soldSeats: number
  revenueCents: number
  totalViews: number
}

export interface AdminDashboardCalendarSession {
  id: number
  publicId: string
  eventId: number
  eventTitle: string
  label: string
  status: string
  statusLabel: string
  venueName: string
  venueCity: string
  startsAt: DateLike
  endsAt: DateLike | null
  salesStartAt: DateLike
  salesEndAt: DateLike
  totalSeats: number
  soldSeats: number
  revenueCents: number
}

export interface AdminDashboardResponse {
  summary: AdminDashboardKpiSummary
  chart: AdminDashboardChartPoint[]
  events: AdminDashboardEventRow[]
  sessions: AdminDashboardCalendarSession[]
}
