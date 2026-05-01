import { computed, onMounted, onUnmounted, toValue } from 'vue'
import type { MaybeRefOrGetter } from 'vue'

interface AdminEventWorkspaceEvent {
  id: number
  slug: string
  title: string
  subtitle: string | null
  description: string
  status: string
  venueId: number
  coverImage: string | null
  startsAt: string | Date
  endsAt: string | Date | null
  salesStartAt: string | Date
  salesEndAt: string | Date
  queueEnabled: boolean
  queueBatchSize: number
  queueWindowSeconds: number
}

export interface AdminEventWorkspaceSession {
  id: number
  publicId: string
  eventId: number
  venueId: number
  label: string
  status: string
  startsAt: string | Date
  endsAt: string | Date | null
  salesStartAt: string | Date
  salesEndAt: string | Date
  queueEnabled: boolean
  queueActivationThreshold: number
  queueBatchSize: number
  queueWindowSeconds: number
  ticketTypes: AdminEventWorkspaceTicketType[]
  seats: AdminEventWorkspaceSeat[]
}

interface AdminEventWorkspaceTicketType {
  id?: number
  venueSectionId?: number | null
  name: string
  description?: string | null
  priceCents: number
  currency: string
  capacity: number
  color: string
  isReservedSeating: boolean
  sortOrder: number
}

interface AdminEventWorkspaceSeat {
  id: number
  sectionNameSnapshot: string
  rowLabelSnapshot: string | null
  seatLabelSnapshot: string
  displayX?: number | null
  displayY?: number | null
  status: string
  priceCents: number
  currency: string
  updatedAt?: string | Date
}

interface AdminEventWorkspaceDetail {
  venue?: {
    id: number
    name: string
    sections: Array<{ id: number, name: string, color: string }>
  }
  event: AdminEventWorkspaceEvent
  sessions: AdminEventWorkspaceSession[]
  ticketTypes: AdminEventWorkspaceTicketType[]
  seats: AdminEventWorkspaceSeat[]
}

interface AdminEventWorkspaceDashboard {
  revenueCents: number
  soldSeatsCount: number
  availableSeatsCount: number
  activeHoldsCount: number
  queueWaitingCount: number
  queueAdmittedCount: number
  occupancyRate: number
  salesBySection: Record<string, { sold: number, revenueCents: number }>
  ageDistribution: Record<string, number>
  genderDistribution: Record<string, number>
  recentOrders: Array<{
    id: number
    customerName: string | null
    customerEmail: string | null
    amountCents: number
    confirmedAt: string | Date | null
  }>
}

interface AdminEventWorkspaceOps {
  totals: {
    ordersCount: number
    ticketsCount: number
    activeHoldsCount: number
    queueEntriesCount: number
  }
  recentOrders: Array<{
    id: number
    customerName: string | null
    customerEmail: string | null
    amountCents: number
    confirmedAt: string | Date | null
    seatLabels: string[]
    ticketLabels: string[]
  }>
  recentTickets: Array<{
    id: number
    attendeeName: string
    attendeeEmail: string
    status: string
    issuedAt: string | Date
    checkedInAt: string | Date | null
    customerName: string | null
    customerEmail: string | null
    seatLabel: string | null
    sectionLabel: string | null
    rowLabel: string | null
  }>
  activeHolds: Array<{
    id: number
    publicId: string
    status: string
    expiresAt: string | Date
    seatCount: number
    seatLabels: string[]
  }>
  queueFeed: Array<{
    id: number
    customerKey: string
    status: string
    admittedAt: string | Date | null
    expiresAt: string | Date | null
    createdAt: string | Date
  }>
  seatActivity: AdminEventWorkspaceSeat[]
}

interface UseAdminEventWorkspaceOptions {
  poll?: boolean
  intervalMs?: number
  includeOps?: boolean
}

export async function useAdminEventWorkspace(eventId: MaybeRefOrGetter<number>, options: UseAdminEventWorkspaceOptions = {}) {
  const resolvedEventId = computed(() => toValue(eventId))
  const shouldPoll = options.poll ?? true
  const intervalMs = options.intervalMs ?? 5000
  const includeOps = options.includeOps ?? true
  let refreshIntervalId: number | null = null

  const eventResponse = await useAsyncData(
    () => `admin-event-${resolvedEventId.value}-detail`,
    () => $fetch<{ data: AdminEventWorkspaceDetail }>(`/api/admin/events/${resolvedEventId.value}`).then(response => response.data),
    {
      watch: [resolvedEventId],
    },
  )
  const dashboardResponse = await useAsyncData(
    () => `admin-event-${resolvedEventId.value}-dashboard`,
    () => $fetch<{ data: AdminEventWorkspaceDashboard }>(`/api/admin/events/${resolvedEventId.value}/dashboard`).then(response => response.data),
    {
      watch: [resolvedEventId],
    },
  )
  const opsResponse = await useAsyncData(
    () => `admin-event-${resolvedEventId.value}-ops`,
    () => includeOps
      ? $fetch<{ data: AdminEventWorkspaceOps }>(`/api/admin/events/${resolvedEventId.value}/ops`).then(response => response.data)
      : Promise.resolve(null),
    {
      watch: [resolvedEventId],
    },
  )

  const detail = computed(() => eventResponse.data.value ?? null)
  const dashboard = computed(() => dashboardResponse.data.value ?? null)
  const ops = computed(() => includeOps ? opsResponse.data.value ?? null : null)

  async function refreshAll() {
    await Promise.all([
      eventResponse.refresh(),
      dashboardResponse.refresh(),
      includeOps ? opsResponse.refresh() : Promise.resolve(),
    ])
  }

  if (shouldPoll) {
    onMounted(() => {
      refreshIntervalId = window.setInterval(() => {
        void refreshAll()
      }, intervalMs)
    })

    onUnmounted(() => {
      if (refreshIntervalId !== null) {
        window.clearInterval(refreshIntervalId)
      }
    })
  }

  return {
    detail,
    dashboard,
    ops,
    refreshAll,
    refreshDetail: eventResponse.refresh,
    refreshDashboard: dashboardResponse.refresh,
    refreshOps: opsResponse.refresh,
  }
}
