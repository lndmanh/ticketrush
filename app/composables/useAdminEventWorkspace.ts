import { computed, onMounted, onUnmounted, toValue } from 'vue'
import type { MaybeRefOrGetter } from 'vue'
import type {
  AdminEventWorkspaceDashboard,
  AdminEventWorkspaceDetail,
  AdminEventWorkspaceOps,
  UseAdminEventWorkspaceOptions,
} from '~~/types/admin-events'

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
