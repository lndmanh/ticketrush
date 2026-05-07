<script setup lang="ts">
import { CalendarClock, Layers3, LockKeyhole, Ticket } from '@lucide/vue'
import { useForm } from 'vee-validate'
import { toast } from 'vue-sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { eventPricingFormSchema, getEventSessionTimingIssues } from '#shared/schemas/ticketingSchema'
import type { EventPricingFormInput } from '#shared/schemas/ticketingSchema'

const { t } = useI18n()

const route = useRoute()
const eventId = computed(() => Number(route.params.id))
const isSaving = ref(false)
const sessionValidationErrors = ref<Record<string, string>>({})

const { detail, refreshDetail } = await useAdminEventWorkspace(eventId, {
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
        ticketTypes: s.ticketTypes.map(tt => ({
          id: tt.id,
          description: tt.description ?? '',
          name: tt.name,
          venueSectionId: tt.venueSectionId ?? null,
          priceCents: tt.priceCents,
          currency: tt.currency,
          color: tt.color,
          isReservedSeating: tt.isReservedSeating,
          capacity: tt.capacity,
          sortOrder: tt.sortOrder,
        })),
      })),
    },
  })
}, { immediate: true })

const isLockedConfiguration = computed(() => detail.value?.event?.status !== 'draft')

function normalizeSessionErrorPath(path: string) {
  return path.replace(/\[(\d+)\]/g, '.$1')
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function getErrorMessage(errorValue: unknown, fallback: string) {
  if (!isRecord(errorValue)) {
    return fallback
  }

  const data = errorValue.data

  if (isRecord(data)) {
    if (isRecord(data.error) && typeof data.error.message === 'string' && data.error.message) {
      return data.error.message
    }

    if (typeof data.message === 'string' && data.message) {
      return data.message
    }

    if (typeof data.statusMessage === 'string' && data.statusMessage) {
      return data.statusMessage
    }
  }

  if (typeof errorValue.message === 'string' && errorValue.message) {
    return errorValue.message
  }

  return fallback
}

interface ExistingPricingTicket {
  id?: number
  name: string
  venueSectionId?: number | null
  currency: string
  isReservedSeating: boolean
  description?: string | null
}

interface ExistingPricingSession {
  id?: number
  publicId?: string
  queueEnabled?: boolean
  ticketTypes: ExistingPricingTicket[]
}

function buildSessionValidationErrors(sessions: EventPricingFormInput['sessions']) {
  const result = eventPricingFormSchema.safeParse({ sessions })
  const errors: Record<string, string> = {}
  if (!result.success) {
    for (const issue of result.error.issues) {
      const normalizedPath = normalizeSessionErrorPath(issue.path.join('.'))
      if (normalizedPath.startsWith('sessions')) {
        errors[normalizedPath] = issue.message
      }
    }
  }

  sessions.forEach((session, sessionIndex) => {
    const sessionLabel = session.label?.trim() || `Session ${sessionIndex + 1}`
    for (const issue of getEventSessionTimingIssues(session, sessionLabel)) {
      errors[`sessions.${sessionIndex}.${issue.field}`] = issue.message
    }
  })

  return errors
}

function getFirstValidationError(errors: Record<string, string>) {
  return Object.values(errors)[0] || 'Please fix the highlighted fields'
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

function updateSessions(sessions: EventPricingFormInput['sessions']) {
  setFieldValue('sessions', sessions)
  if (Object.keys(sessionValidationErrors.value).length) {
    sessionValidationErrors.value = buildSessionValidationErrors(sessions)
  }
}

function findExistingSession(existingSessions: ExistingPricingSession[], session: EventPricingFormInput['sessions'][number], index: number) {
  const byId = session.id ? existingSessions.find(existing => existing.id === session.id) : undefined
  if (byId) {
    return byId
  }

  const byPublicId = session.publicId ? existingSessions.find(existing => existing.publicId === session.publicId) : undefined
  if (byPublicId) {
    return byPublicId
  }

  return existingSessions[index]
}

function findExistingTicket(
  tickets: ExistingPricingTicket[],
  ticket: EventPricingFormInput['sessions'][number]['ticketTypes'][number],
  index: number,
) {
  const byId = ticket.id ? tickets.find(existing => existing.id === ticket.id) : undefined
  if (byId) {
    return byId
  }

  const byStableFields = tickets.find(existing =>
    existing.name === ticket.name
    && (existing.venueSectionId ?? null) === ticket.venueSectionId
    && existing.currency === ticket.currency
    && existing.isReservedSeating === ticket.isReservedSeating,
  )
  if (byStableFields) {
    return byStableFields
  }

  return tickets[index]
}

function buildSessionPayload(sessions: EventPricingFormInput['sessions']) {
  const existingSessions: ExistingPricingSession[] = detail.value?.sessions ?? []

  return sessions.map((session, sessionIndex) => {
    const existingSession = findExistingSession(existingSessions, session, sessionIndex)

    return {
      ...session,
      queueEnabled: session.queueEnabled,
      startsAt: new Date(session.startsAt),
      endsAt: session.endsAt ? new Date(session.endsAt) : undefined,
      salesStartAt: new Date(session.salesStartAt),
      salesEndAt: new Date(session.salesEndAt),
      ticketTypes: session.ticketTypes.map((ticketType, ticketIndex) => {
        const existingTicket = existingSession?.ticketTypes ? findExistingTicket(existingSession.ticketTypes, ticketType, ticketIndex) : undefined

        return {
          ...ticketType,
          description: existingTicket?.description ?? ticketType.description,
          sortOrder: ticketIndex,
        }
      }),
    }
  })
}

const onSubmit = handleSubmit(
  async (formValues) => {
    sessionValidationErrors.value = {}
    if (!validateSessions(formValues.sessions)) {
      return
    }

    isSaving.value = true

    try {
      const eventFields = detail.value?.event
      if (!eventFields) {
        throw new Error('Event details not loaded')
      }

      await $fetch(`/api/admin/events/${eventId.value}`, {
        method: 'PUT',
        body: {
          id: eventId.value,
          slug: eventFields.slug,
          title: eventFields.title,
          subtitle: eventFields.subtitle,
          description: eventFields.description,
          venueId: eventFields.venueId,
          coverImage: eventFields.coverImage,
          status: eventFields.status,
          startsAt: new Date(eventFields.startsAt),
          endsAt: eventFields.endsAt ? new Date(eventFields.endsAt) : undefined,
          salesStartAt: new Date(eventFields.salesStartAt),
          salesEndAt: new Date(eventFields.salesEndAt),
          sessions: buildSessionPayload(formValues.sessions),
        },
      })

      toast.success(t('admin_event_pricing.updated'))
      await refreshDetail()
    }
    catch (err) {
      toast.error(getErrorMessage(err, t('admin_event_pricing.update_failed')))
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

    <Card class="shadow-none">
      <CardHeader class="border-b bg-muted/20">
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
          <Item
            v-if="isLockedConfiguration"
            variant="ghost"
            class="bg-muted/35"
          >
            <ItemMedia variant="icon">
              <LockKeyhole />
            </ItemMedia>
            <ItemContent>
              <ItemTitle>{{ $t('admin_event_pricing.read_only_title') }}</ItemTitle>
              <ItemDescription>
                {{ $t('admin_event_pricing.read_only_desc') }}
              </ItemDescription>
            </ItemContent>
          </Item>

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
              class="sm:min-w-36"
              :disabled="isLockedConfiguration || isSaving"
              :is-loading="isSaving"
            >
              {{ $t('admin_event_pricing.save_changes') }}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  </div>
</template>
