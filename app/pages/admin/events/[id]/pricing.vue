<script setup lang="ts">
import { CalendarClock, Layers3, LockKeyhole, Ticket } from '@lucide/vue'
import { useForm } from 'vee-validate'
import { toast } from 'vue-sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { eventPricingFormSchema } from '#shared/schemas/ticketingSchema'
import type { EventPricingFormInput } from '#shared/schemas/ticketingSchema'

const route = useRoute()
const eventId = computed(() => Number(route.params.id))
const isSaving = ref(false)

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
        startsAt: toDateTimeLocal(s.startsAt),
        endsAt: toDateTimeLocal(s.endsAt),
        salesStartAt: toDateTimeLocal(s.salesStartAt),
        salesEndAt: toDateTimeLocal(s.salesEndAt),
        ticketTypes: s.ticketTypes.map(tt => ({
          name: tt.name,
          venueSectionId: tt.venueSectionId ?? null,
          priceCents: tt.priceCents,
          currency: tt.currency,
          isReservedSeating: tt.isReservedSeating,
          capacity: tt.capacity,
          sortOrder: tt.sortOrder,
        })),
      })),
    },
  })
}, { immediate: true })

const isLockedConfiguration = computed(() => detail.value?.event?.status !== 'draft')

const onSubmit = handleSubmit(async (formValues) => {
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
        sessions: formValues.sessions.map(s => ({
          ...s,
          startsAt: new Date(s.startsAt),
          endsAt: s.endsAt ? new Date(s.endsAt) : undefined,
          salesStartAt: new Date(s.salesStartAt),
          salesEndAt: new Date(s.salesEndAt),
          ticketTypes: s.ticketTypes.map((tt, index) => ({
            ...tt,
            sortOrder: index,
          })),
        })),
      },
    })

    toast.success('Event pricing updated')
    await refreshDetail()
  }
  catch (err: unknown) {
    toast.error(err && typeof err === 'object' && 'data' in err && err.data && typeof err.data === 'object' && 'message' in err.data ? String(err.data.message) : undefined || 'Failed to update pricing')
  }
  finally {
    isSaving.value = false
  }
})

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
            <CardTitle>Pricing & scheduling</CardTitle>
            <p class="mt-1 text-sm text-muted-foreground">
              Edit the event sessions buyers will see on the public event page.
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
              <ItemTitle>Pricing is read-only</ItemTitle>
              <ItemDescription>
                Switch the event back to draft if you need to make pricing or scheduling changes.
              </ItemDescription>
            </ItemContent>
          </Item>

          <AdminEventsAdminEventSessionEditor
            :model-value="values.sessions || []"
            :venue-sections="detail.venue?.sections ?? []"
            :locked="isLockedConfiguration"
            :default-venue-id="detail.event.venueId"
            @update:model-value="setFieldValue('sessions', $event)"
          />

          <div class="flex flex-col gap-3 border-t pt-5 sm:flex-row sm:items-center sm:justify-between">
            <p class="text-sm text-muted-foreground">
              Changes apply to every session listed above.
            </p>
            <Button
              type="submit"
              class="sm:min-w-36"
              :disabled="isLockedConfiguration || isSaving"
              :is-loading="isSaving"
            >
              Save changes
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  </div>
</template>
