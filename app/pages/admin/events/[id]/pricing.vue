<script setup lang="ts">
import { SaveIcon } from '@lucide/vue'
import { useForm } from 'vee-validate'
import { toast } from 'vue-sonner'
import type { EventSession } from '#shared/db'
import { apiRequest } from '@/utils/apiRequest'
import { parseApiError } from '@/utils/apiError'
import { apiRoutes } from '#shared/apiRoutes'
import { eventPricingFormSchema, getEventSessionTimingIssues } from '#shared/schemas/ticketingSchema'
import type { EventPricingFormInput } from '#shared/schemas/ticketingSchema'
import type { ApiResponse } from '~~/types/api'
import type { AdminEventWorkspaceDetail, AdminEventWorkspaceSession } from '~~/types/admin-events'
import { EventStatus, PricingMode } from '#shared/commonEnums'

const route = useRoute()
const { t } = useI18n()
const eventId = computed(() => Number(route.params.id))
const isSaving = ref(false)
const sessionValidationErrors = ref<Record<string, string>>({})
const syncDialogOpen = ref(false)
const syncDialogSessionId = ref<number | null>(null)

type VenueSection = NonNullable<NonNullable<AdminEventWorkspaceDetail['venue']>['sections']>[number]
type SessionSectionPrice = EventPricingFormInput['sessions'][number]['sectionPrices'][number]
type SessionPricingSource = {
  pricingMode: EventPricingFormInput['sessions'][number]['pricingMode']
  currency: string
  sectionPrices: SessionSectionPrice[]
}

const { detail, refreshDetail, fetchVenueLayoutSyncPreview, applyVenueLayoutSync } = await useAdminEventWorkspace(eventId, {
  poll: false,
  includeOps: false,
})

const defaultValues: EventPricingFormInput = {
  sessions: [],
}

const { handleSubmit, resetForm, setFieldValue, values } = useForm({
  initialValues: { ...defaultValues },
  validationSchema: eventPricingFormSchema,
})

function toDateTimeLocal(value: string | Date | null | undefined) {
  if (!value) {
    return ''
  }

  const date = new Date(value)
  const pad = (part: number) => String(part).padStart(2, '0')

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function normalizeSectionPricesForVenue(session: SessionPricingSource, venueSections: VenueSection[]): SessionSectionPrice[] {
  return venueSections.map((section, index) => {
    const matchedPrice = session.sectionPrices.find(sectionPrice => sectionPrice.venueSectionId === section.id)

    return {
      venueSectionId: section.id,
      priceCents: matchedPrice?.priceCents ?? 0,
      currency: matchedPrice?.currency ?? session.currency,
      sortOrder: index,
    }
  })
}

watch(detail, (value) => {
  if (!value?.sessions) return
  resetForm({
    values: {
      sessions: value.sessions.map(s => ({
        id: s.id,
        publicId: s.publicId,
        label: s.label,
        venueId: s.venueId,
        status: s.status,
        queueEnabled: s.queueEnabled,
        startsAt: toDateTimeLocal(s.startsAt),
        endsAt: toDateTimeLocal(s.endsAt),
        salesStartAt: toDateTimeLocal(s.salesStartAt),
        salesEndAt: toDateTimeLocal(s.salesEndAt),
        pricingMode: s.pricingMode,
        currency: s.currency,
        sectionPrices: normalizeSectionPricesForVenue(s, value.venue?.sections ?? []),
        seatOverrides: s.seatOverrides.map(seatOverride => ({
          venueSeatId: seatOverride.venueSeatId,
          venueSectionId: seatOverride.venueSectionId,
          priceCents: seatOverride.priceCents,
          currency: seatOverride.currency,
          isDisabled: seatOverride.isDisabled,
        })),
      })),
    },
  })
}, { immediate: true })

const isLockedConfiguration = computed(() => detail.value?.event?.status !== EventStatus.Draft)
const staleSessions = computed(() => detail.value?.sessions.filter(session => session.venueSyncStatus === 'stale') ?? [])
const hasStaleSessions = computed(() => staleSessions.value.length > 0)
const selectedSyncSession = computed(() => {
  const sessionId = syncDialogSessionId.value
  if (!detail.value || sessionId === null) {
    return null
  }

  return detail.value.sessions.find(session => session.id === sessionId) ?? null
})

function normalizeSessionErrorPath(path: string) {
  return path.replace(/\[(\d+)\]/g, '.$1')
}

function buildSessionValidationErrors(sessions: EventPricingFormInput['sessions']) {
  const result = eventPricingFormSchema.safeParse({ sessions })
  const errors: Record<string, string> = {}
  if (!result.success) {
    for (const issue of result.error.issues) {
      const normalizedPath = normalizeSessionErrorPath(issue.path.join('.'))
      if (normalizedPath.startsWith('sessions')) {
        errors[normalizedPath] = t(issue.message)
      }
    }
  }

  sessions.forEach((session, sessionIndex) => {
    const sessionLabel = session.label?.trim() || `Session ${sessionIndex + 1}`
    for (const issue of getEventSessionTimingIssues(session, sessionLabel)) {
      errors[`sessions.${sessionIndex}.${issue.field}`] = t(issue.message)
    }
  })

  return errors
}

function getFirstValidationError(errors: Record<string, string>) {
  return Object.values(errors)[0] || t('admin_venue_detail.fix_highlighted_fields')
}

function validateSessions(sessions: EventPricingFormInput['sessions']) {
  const errors = buildSessionValidationErrors(sessions)
  if (Object.keys(errors).length) {
    sessionValidationErrors.value = errors
    toast.error(getFirstValidationError(errors))
    return false
  }

  return true
}

function openVenueSync(session: AdminEventWorkspaceSession | null) {
  if (!session) {
    return
  }

  syncDialogSessionId.value = session.id
  syncDialogOpen.value = true
}

async function handleVenueSyncApplied() {
  toast.success(t('admin_event_sync.synced'))
  sessionValidationErrors.value = {}
  await refreshDetail()
}

function updateSessions(sessions: EventPricingFormInput['sessions']) {
  setFieldValue('sessions', sessions)
  if (Object.keys(sessionValidationErrors.value).length) {
    sessionValidationErrors.value = buildSessionValidationErrors(sessions)
  }
}

function buildPricingPayload(session: EventPricingFormInput['sessions'][number]) {
  if (session.pricingMode === PricingMode.Uniform) {
    return {
      pricingMode: session.pricingMode,
      currency: session.currency,
      priceCents: session.sectionPrices[0]?.priceCents ?? 0,
    }
  }

  const sectionPrices = normalizeSectionPricesForVenue(session, detail.value?.venue?.sections ?? [])

  return {
    pricingMode: session.pricingMode,
    currency: session.currency,
    sectionPrices: sectionPrices.map((sectionPrice, sectionIndex) => ({
      venueSectionId: sectionPrice.venueSectionId,
      priceCents: sectionPrice.priceCents,
      currency: sectionPrice.currency || session.currency,
      sortOrder: sectionIndex,
    })),
  }
}

const onSubmit = handleSubmit(
  async (formValues) => {
    sessionValidationErrors.value = {}
    if (hasStaleSessions.value) {
      toast.error(t('admin_event_sync.pricing_stale_desc'))
      return
    }

    if (!validateSessions(formValues.sessions)) {
      return
    }

    isSaving.value = true

    try {
      for (const session of formValues.sessions) {
        if (!session.id) {
          continue
        }

        const response = await apiRequest<ApiResponse<EventSession | undefined>>(apiRoutes.adminEventSessionPricing(eventId.value, session.id), {
          method: 'PUT',
          body: buildPricingPayload(session),
        })
        if (!response.success) throw response
      }

      toast.success(t('admin_event_pricing.updated'))
      await refreshDetail()
    }
    catch (err) {
      toast.error(parseApiError(err, t('admin_event_pricing.update_failed')).message)
    }
    finally {
      isSaving.value = false
    }
  },
  ({ errors }) => {
    const sessionErrors: Record<string, string> = {}
    for (const [path, message] of Object.entries(errors)) {
      if (path.startsWith('sessions') && message) {
        sessionErrors[normalizeSessionErrorPath(path)] = String(message)
      }
    }

    sessionValidationErrors.value = sessionErrors
    const firstError = Object.values(sessionErrors)[0] || Object.values(errors).flat().filter(Boolean)[0] || 'Please fix the highlighted fields'
    toast.error(String(firstError))
  },
)

definePageMeta({
  title: 'Event pricing',
  breadcrumb: 'Event pricing',
  middleware: ['auth', 'admin'],
  layout: 'dashboard',
})
</script>

<template>
  <div
    v-if="detail"
    class="space-y-6"
  >
    <AdminEventsAdminEventNav :event-id="eventId" />

    <Card
      class="overflow-hidden shadow-none pt-0"
    >
      <CardHeader class="border-b bg-muted/20 py-6!">
        <div class="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <CardTitle>{{ $t('admin_event_pricing.title') }}</CardTitle>
            <p class="mt-1 text-sm text-muted-foreground">
              {{ $t('admin_event_pricing.desc') }}
            </p>
          </div>
          <Badge
            variant="outline"
            class="w-fit capitalize"
          >
            {{ detail.event.status.replaceAll('_', ' ') }}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <form
          class="space-y-6"
          @submit.prevent="onSubmit"
        >
          <Alert
            v-if="isLockedConfiguration"
            variant="destructive"
          >
            <AlertTitle>{{ $t('admin_event_pricing.read_only_title') }}</AlertTitle>
            <AlertDescription>
              {{ $t('admin_event_pricing.read_only_desc') }}
            </AlertDescription>
          </Alert>

          <Alert
            v-if="hasStaleSessions"
            variant="destructive"
          >
            <AlertTitle>{{ $t('admin_event_sync.pricing_stale_title') }}</AlertTitle>
            <AlertDescription class="mt-2 space-y-3">
              <p>{{ $t('admin_event_sync.pricing_stale_desc') }}</p>
              <div class="space-y-2">
                <div
                  v-for="session in staleSessions"
                  :key="session.id"
                  class="flex flex-col gap-2 rounded-lg border border-destructive/20 bg-background/70 p-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <span class="text-sm font-medium text-foreground">
                    {{ $t('admin_event_sync.pricing_stale_session', { session: session.label }) }}
                  </span>
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    class="w-fit"
                    @click="openVenueSync(session)"
                  >
                    {{ $t('admin_event_sync.sync_button') }}
                  </Button>
                </div>
              </div>
            </AlertDescription>
          </Alert>

          <AdminEventsAdminEventSessionEditor
            :model-value="values.sessions || []"
            :venue-sections="detail.venue?.sections ?? []"
            :locked="isLockedConfiguration"
            :default-venue-id="detail.event.venueId"
            :validation-errors="sessionValidationErrors"
            @update:model-value="updateSessions"
          />

          <div class="flex flex-col gap-3 border-t pt-5 sm:flex-row sm:items-center sm:justify-between">
            <p class="text-sm text-muted-foreground">
              {{ $t('admin_event_pricing.changes_note') }}
            </p>
            <Button
              type="submit"
              :disabled="isLockedConfiguration || hasStaleSessions || isSaving"
              :is-loading="isSaving"
            >
              <SaveIcon class="size-4" />
              {{ $t('admin_event_pricing.save_changes') }}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>

    <AdminEventsAdminVenueLayoutSyncDialog
      v-model:open="syncDialogOpen"
      :session-id="syncDialogSessionId"
      :session-label="selectedSyncSession?.label"
      :load-preview="fetchVenueLayoutSyncPreview"
      :apply-sync="applyVenueLayoutSync"
      @applied="handleVenueSyncApplied"
    />
  </div>
</template>
