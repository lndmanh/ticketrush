import { computed, onMounted, onUnmounted, toValue } from 'vue'
import type { MaybeRefOrGetter } from 'vue'
import { apiRequest } from '@/utils/apiRequest'
import { apiRoutes } from '#shared/apiRoutes'
import type { ApiResponse } from '~~/types/api'
import type {
  AdminEventWorkspaceDashboard,
  AdminEventWorkspaceDetail,
  AdminEventWorkspaceOps,
  AdminEventWorkspaceSession,
  VenueLayoutSyncApplyInput,
  VenueLayoutSyncPreview,
  UseAdminEventWorkspaceOptions,
} from '~~/types/admin-events'

export async function useAdminEventWorkspace(eventId: MaybeRefOrGetter<number>, options: UseAdminEventWorkspaceOptions = {}) {
  const resolvedEventId = computed(() => toValue(eventId))
  const shouldPoll = options.poll ?? true
  const intervalMs = options.intervalMs ?? 5000
  const includeOps = options.includeOps ?? true
  let refreshIntervalId: number | null = null

  const eventResponse = await useAPI<ApiResponse<AdminEventWorkspaceDetail>>(() => apiRoutes.adminEvent(resolvedEventId.value), { watch: [resolvedEventId] })
  const dashboardResponse = await useAPI<ApiResponse<AdminEventWorkspaceDashboard>>(() => apiRoutes.adminEventDashboard(resolvedEventId.value), { watch: [resolvedEventId] })
  const opsResponse = await useAPI<ApiResponse<AdminEventWorkspaceOps>>(() => apiRoutes.adminEventOps(resolvedEventId.value), {
    watch: [resolvedEventId],
    immediate: includeOps,
  })

  const detail = computed(() => eventResponse.data.value?.success ? eventResponse.data.value.data : null)
  const dashboard = computed(() => dashboardResponse.data.value?.success ? dashboardResponse.data.value.data : null)
  const ops = computed(() => includeOps && opsResponse.data.value?.success ? opsResponse.data.value.data : null)

  async function fetchVenueLayoutSyncPreview(sessionId: number): Promise<VenueLayoutSyncPreview> {
    const response = await apiRequest<ApiResponse<VenueLayoutSyncPreview>>(apiRoutes.adminEventSessionVenueSync(resolvedEventId.value, sessionId))
    if (!response.success) {
      throw response
    }

    return response.data
  }

  async function applyVenueLayoutSync(sessionId: number, payload: VenueLayoutSyncApplyInput): Promise<AdminEventWorkspaceSession> {
    const response = await apiRequest<ApiResponse<AdminEventWorkspaceSession>>(apiRoutes.adminEventSessionVenueSync(resolvedEventId.value, sessionId), {
      method: 'POST',
      body: payload,
    })

    if (!response.success) {
      throw response
    }

    await refreshAll()

    return response.data
  }

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
    fetchVenueLayoutSyncPreview,
    applyVenueLayoutSync,
    refreshAll,
    refreshDetail: eventResponse.refresh,
    refreshDashboard: dashboardResponse.refresh,
    refreshOps: opsResponse.refresh,
  }
}
