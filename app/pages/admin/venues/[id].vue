<script setup lang="ts">
import type { z } from 'zod'
import { Field as VeeField, useForm } from 'vee-validate'
import { toast } from 'vue-sonner'
import { createVenueSchema } from '#shared/schemas/ticketingSchema'
import type { Event } from '#shared/db'
import type { VenueSectionDraftInput } from '#shared/schemas/ticketingSchema'
import type { ApiResponse } from '~~/types/api'
import type { SeatMapSeatClickPayload } from '~~/types/seatmap'
import type { VenueDetail } from '~~/types/venues'
import { ArrowLeft, Building2, CalendarRange, LayoutGrid, Rows3, Save, Users, X } from '@lucide/vue'
import AdminVenuesVenueSeatLayoutEditor from '@/components/admin/venues/VenueSeatLayoutEditor.vue'
import { createVenueSeatMapPreviewSeats } from '@/lib/venueSeatMapPreview'
import { apiRequest } from '@/utils/apiRequest'
import { parseApiError } from '@/utils/apiError'
import { getDisplayDateLocale } from '@/lib/localizedEvents'
import { apiRoutes } from '#shared/apiRoutes'

interface AdminEventListItem {
  id: number
  title: string
  status: string
  venueId: number
  startsAt: string | Date
}

const { locale } = useI18n()

function formatDateTime(value: string | Date) {
  return new Date(value).toLocaleString(getDisplayDateLocale(locale.value))
}

type ConfigTab = 'details' | 'layout' | 'events'

const venueIdentitySchema = createVenueSchema.omit({ sections: true })
type VenueIdentityInput = z.infer<typeof venueIdentitySchema>

interface VenueBlueprintPreset {
  id: string
  label: string
  description: string
  sections: VenueSectionDraftInput[]
}

const route = useRoute()
const venueId = computed(() => Number(route.params.id))

const { data: venueResponse, refresh: refreshVenue } = await useAPI<ApiResponse<VenueDetail>>(() => apiRoutes.adminVenue(venueId.value))
const { data: eventsResponse } = await useAPI<ApiResponse<Event[]>>(() => apiRoutes.ADMIN_EVENTS)

const venueDetail = computed<VenueDetail | null>(() => venueResponse.value?.success ? venueResponse.value.data : null)
const linkedEvents = computed<AdminEventListItem[]>(() => {
  const items = eventsResponse.value?.success ? eventsResponse.value.data : []
  return items.filter(event => event.venueId === venueId.value)
})

const defaultIdentityValues: VenueIdentityInput = {
  slug: '',
  name: '',
  description: '',
  city: 'Ho Chi Minh City',
  country: 'Vietnam',
  address: '',
  coverImage: '',
}

const { handleSubmit, resetForm, values } = useForm<VenueIdentityInput>({
  initialValues: { ...defaultIdentityValues },
  validationSchema: venueIdentitySchema,
  keepValuesOnUnmount: true,
})

const sectionLayouts = ref<VenueSectionDraftInput[]>([])
const inspectedVenueSeat = ref<SeatMapSeatClickPayload | null>(null)
const venuePreviewSeats = computed(() => createVenueSeatMapPreviewSeats(sectionLayouts.value))
const savedVenueSnapshot = ref('')
const isSaving = ref(false)
const activeConfigTab = ref<ConfigTab>('details')
const workspaceRef = ref<HTMLElement | null>(null)
const viewportWidth = ref(0)
const desktopVisualizationSize = ref(58)
const mobileVisualizationSize = ref(46)
const resizingAxis = ref<'columns' | 'rows' | null>(null)

function createRow(label: string, rowIndex: number, seatCount: number) {
  return {
    label,
    sortOrder: rowIndex,
    seats: Array.from({ length: seatCount }, (_, seatIndex) => ({
      label: String(seatIndex + 1),
      seatNumber: seatIndex + 1,
      x: seatIndex,
      y: rowIndex,
      sortOrder: seatIndex,
      accessibilityLabel: `${label}-${seatIndex + 1}`,
      isAccessible: false,
    })),
  }
}

function createSectionBlueprint(code: string, name: string, color: string, rowCount: number, seatsPerRow: number): VenueSectionDraftInput {
  return {
    code,
    name,
    color,
    sortOrder: 0,
    rows: Array.from({ length: rowCount }, (_, rowIndex) => createRow(String.fromCharCode(65 + rowIndex), rowIndex, seatsPerRow)),
  }
}

function createVenueSnapshot(identity: VenueIdentityInput, sections: VenueSectionDraftInput[]) {
  return JSON.stringify({
    identity: {
      slug: identity.slug.trim(),
      name: identity.name.trim(),
      description: identity.description?.trim() ?? '',
      city: identity.city.trim(),
      country: identity.country.trim(),
      address: identity.address.trim(),
      coverImage: identity.coverImage?.trim() ?? '',
    },
    sections: sections.map((section, sectionIndex) => ({
      code: section.code.trim(),
      name: section.name.trim(),
      color: section.color.trim(),
      sortOrder: sectionIndex,
      rows: section.rows.map((row, rowIndex) => ({
        label: row.label.trim(),
        sortOrder: rowIndex,
        seats: row.seats.map((seat, seatIndex) => ({
          label: seat.label.trim(),
          seatNumber: seat.seatNumber,
          x: seat.x,
          y: seat.y,
          sortOrder: seatIndex,
          accessibilityLabel: seat.accessibilityLabel?.trim() ?? '',
          isAccessible: seat.isAccessible,
        })),
      })),
    })),
  })
}

const blueprintPresets: VenueBlueprintPreset[] = [
  {
    id: 'club',
    label: 'Club floor',
    description: 'Compact premium room with a front VIP block and tighter side sections.',
    sections: [
      createSectionBlueprint('VIP', 'Front VIP', '#7C3AED', 4, 8),
      createSectionBlueprint('MID', 'Middle floor', '#2563EB', 6, 10),
      createSectionBlueprint('SIDE', 'Side riser', '#F97316', 5, 6),
    ],
  },
  {
    id: 'hall',
    label: 'Concert hall',
    description: 'Balanced hall layout with wider main sections for seated launches.',
    sections: [
      createSectionBlueprint('A', 'Orchestra', '#E11D48', 7, 12),
      createSectionBlueprint('B', 'Center', '#0F766E', 8, 14),
      createSectionBlueprint('C', 'Rear', '#2563EB', 6, 12),
    ],
  },
  {
    id: 'theater',
    label: 'Theater split',
    description: 'Three-zone theater with denser center coverage and lighter balcony capacity.',
    sections: [
      createSectionBlueprint('PRM', 'Premium center', '#DC2626', 5, 10),
      createSectionBlueprint('STD', 'Standard bowl', '#7C2D12', 7, 11),
      createSectionBlueprint('BAL', 'Balcony', '#4338CA', 4, 9),
    ],
  },
]

watch(venueDetail, (value) => {
  if (!value) {
    return
  }

  const identityValues: VenueIdentityInput = {
    slug: value.venue.slug,
    name: value.venue.name,
    description: value.venue.description ?? '',
    city: value.venue.city,
    country: value.venue.country,
    address: value.venue.address,
    coverImage: value.venue.coverImage ?? '',
  }

  const layoutValues = value.sections.map((section, sectionIndex) => ({
    id: section.id,
    code: section.code,
    name: section.name,
    color: section.color,
    sortOrder: sectionIndex,
    rows: section.rows.map((row, rowIndex) => ({
      id: row.id,
      label: row.label,
      sortOrder: rowIndex,
      seats: row.seats.map((seat, seatIndex) => ({
        id: seat.id,
        label: seat.label,
        seatNumber: seat.seatNumber,
        x: seat.x,
        y: seat.y,
        sortOrder: seatIndex,
        accessibilityLabel: seat.accessibilityLabel ?? '',
        isAccessible: seat.isAccessible,
      })),
    })),
  }))

  resetForm({ values: identityValues })
  sectionLayouts.value = layoutValues
  inspectedVenueSeat.value = null
  savedVenueSnapshot.value = createVenueSnapshot(identityValues, layoutValues)
}, { immediate: true })

const sectionSummaries = computed(() => {
  return sectionLayouts.value.map((section, index) => {
    const capacity = section.rows.reduce((total, row) => total + row.seats.length, 0)
    const maxColumns = Math.max(...section.rows.map(row => Math.max(...row.seats.map(seat => seat.x + 1), row.seats.length)), 0)

    return {
      id: `${section.code}-${index}`,
      code: section.code,
      name: section.name,
      color: section.color,
      rowCount: section.rows.length,
      maxColumns,
      capacity,
      accessibleSeats: section.rows.flatMap(row => row.seats).filter(seat => seat.isAccessible).length,
    }
  })
})

const largestSection = computed(() => [...sectionSummaries.value].sort((left, right) => right.capacity - left.capacity)[0] ?? null)

const totalRows = computed(() => sectionSummaries.value.reduce((total, section) => total + section.rowCount, 0))
const totalCapacity = computed(() => sectionSummaries.value.reduce((total, section) => total + section.capacity, 0))
const totalSections = computed(() => sectionLayouts.value.length)
const isDesktopViewport = computed(() => viewportWidth.value >= 1024)

const currentVenueSnapshot = computed(() => createVenueSnapshot({
  slug: values.slug ?? '',
  name: values.name ?? '',
  description: values.description ?? '',
  city: values.city ?? '',
  country: values.country ?? '',
  address: values.address ?? '',
  coverImage: values.coverImage ?? '',
}, sectionLayouts.value))

const isChanged = computed(() => savedVenueSnapshot.value !== '' && currentVenueSnapshot.value !== savedVenueSnapshot.value)

const workspaceStyle = computed(() => {
  if (isDesktopViewport.value) {
    return {
      gridTemplateColumns: `minmax(0, ${desktopVisualizationSize.value}%) 0.875rem minmax(22rem, ${100 - desktopVisualizationSize.value}%)`,
    }
  }

  return {
    gridTemplateRows: `minmax(0, ${mobileVisualizationSize.value}%) 0.875rem minmax(0, ${100 - mobileVisualizationSize.value}%)`,
  }
})

function clampPercentage(value: number, minimum: number, maximum: number) {
  return Math.min(Math.max(value, minimum), maximum)
}

function syncViewportWidth() {
  viewportWidth.value = window.innerWidth
}

function startResizing(event: PointerEvent) {
  const workspace = workspaceRef.value
  if (!workspace) {
    return
  }

  const rect = workspace.getBoundingClientRect()
  const axis = isDesktopViewport.value ? 'columns' : 'rows'
  resizingAxis.value = axis

  if (axis === 'columns') {
    const nextValue = ((event.clientX - rect.left) / rect.width) * 100
    desktopVisualizationSize.value = clampPercentage(nextValue, 38, 68)
  }
  else {
    const nextValue = ((event.clientY - rect.top) / rect.height) * 100
    mobileVisualizationSize.value = clampPercentage(nextValue, 32, 68)
  }
}

function handlePointerMove(event: PointerEvent) {
  if (!resizingAxis.value) {
    return
  }

  const workspace = workspaceRef.value
  if (!workspace) {
    return
  }

  const rect = workspace.getBoundingClientRect()
  if (resizingAxis.value === 'columns') {
    const nextValue = ((event.clientX - rect.left) / rect.width) * 100
    desktopVisualizationSize.value = clampPercentage(nextValue, 38, 68)
    return
  }

  const nextValue = ((event.clientY - rect.top) / rect.height) * 100
  mobileVisualizationSize.value = clampPercentage(nextValue, 32, 68)
}

function stopResizing() {
  resizingAxis.value = null
}

function applyBlueprintPreset(preset: VenueBlueprintPreset) {
  sectionLayouts.value = preset.sections.map((section, sectionIndex) => ({
    ...section,
    sortOrder: sectionIndex,
    rows: section.rows.map((row, rowIndex) => ({
      ...row,
      sortOrder: rowIndex,
      seats: row.seats.map((seat, seatIndex) => ({
        ...seat,
        sortOrder: seatIndex,
      })),
    })),
  }))
  inspectedVenueSeat.value = null
  activeConfigTab.value = 'layout'
}

const onSubmit = handleSubmit(
  async (formValues) => {
    const payload = {
      ...formValues,
      sections: sectionLayouts.value,
    }

    const validation = createVenueSchema.safeParse(payload)
    if (!validation.success) {
      toast.error(validation.error.issues[0]?.message || 'Please fix the venue blueprint before saving')
      return
    }

    isSaving.value = true
    try {
      const response = await apiRequest<ApiResponse<VenueDetail>>(apiRoutes.adminVenue(venueId.value), {
        method: 'PUT',
        body: validation.data,
      })
      if (!response.success) throw response

      toast.success('Venue updated')
      savedVenueSnapshot.value = currentVenueSnapshot.value
      await refreshVenue()
    }
    catch (error) {
      toast.error(parseApiError(error, 'We could not update the venue blueprint').message)
    }
    finally {
      isSaving.value = false
    }
  },
  ({ errors }) => {
    const firstError = Object.values(errors).flat().filter(Boolean)[0] || 'Please fix the highlighted fields'
    toast.error(firstError)
  },
)

onMounted(() => {
  syncViewportWidth()
  window.addEventListener('resize', syncViewportWidth)
  window.addEventListener('pointermove', handlePointerMove)
  window.addEventListener('pointerup', stopResizing)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', syncViewportWidth)
  window.removeEventListener('pointermove', handlePointerMove)
  window.removeEventListener('pointerup', stopResizing)
})

definePageMeta({
  title: 'Venue detail',
  breadcrumb: 'Venue detail',
  middleware: ['auth', 'admin'],
  layout: 'empty',
})
</script>

<template>
  <main
    v-if="venueDetail"
    class="grid h-[100dvh] max-h-[100dvh] grid-rows-[auto_minmax(0,1fr)] overflow-hidden bg-background text-foreground"
  >
    <header class="border-b bg-background px-4 py-2">
      <div class="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div class="flex items-start gap-3">
          <Button
            as-child
            variant="outline"
            size="icon-sm"
          >
            <NuxtLink
              to="/admin/venues"
              :aria-label="$t('admin_venue_detail.back_to_venues')"
            >
              <ArrowLeft />
            </NuxtLink>
          </Button>

          <div>
            <h1 class="text-xl font-semibold">
              {{ venueDetail.venue.name }}
            </h1>
            <p class="text-sm text-muted-foreground">
              {{ $t('admin_venue_detail.setup_label') }}
            </p>
          </div>
        </div>

        <div class="flex flex-col gap-3 sm:flex-row sm:items-center xl:justify-end">
          <div class="flex flex-wrap gap-2 text-xs text-muted-foreground">
            <div class="inline-flex items-center gap-2 rounded-md border bg-muted/30 px-2.5 py-1.5">
              <LayoutGrid class="size-3.5" />
              <span class="font-medium text-foreground">{{ totalSections }}</span>
              <span>{{ $t('admin_venue_detail.sections_stat') }}</span>
            </div>
            <div class="inline-flex items-center gap-2 rounded-md border bg-muted/30 px-2.5 py-1.5">
              <Rows3 class="size-3.5" />
              <span class="font-medium text-foreground">{{ totalRows }}</span>
              <span>{{ $t('admin_venue_detail.rows_stat') }}</span>
            </div>
            <div class="inline-flex items-center gap-2 rounded-md border bg-muted/30 px-2.5 py-1.5">
              <Users class="size-3.5" />
              <span class="font-medium text-foreground">{{ totalCapacity }}</span>
              <span>{{ $t('admin_venue_detail.capacity_stat') }}</span>
            </div>
            <div class="inline-flex items-center gap-2 rounded-md border bg-muted/30 px-2.5 py-1.5">
              <CalendarRange class="size-3.5" />
              <span class="font-medium text-foreground">{{ linkedEvents.length }}</span>
              <span>{{ $t('admin_venue_detail.events_stat') }}</span>
            </div>
          </div>

          <Button
            form="venue-detail-form"
            type="submit"
            class="sm:ml-1"
            :disabled="!isChanged || isSaving"
            :is-loading="isSaving"
          >
            <Save />
            {{ $t('common.save') }}
          </Button>
        </div>
      </div>
    </header>

    <section
      ref="workspaceRef"
      class="grid min-h-0 overflow-hidden gap-3 p-3 md:p-4"
      :style="workspaceStyle"
      :class="resizingAxis ? 'select-none' : ''"
    >
      <div class="h-full min-h-0 overflow-hidden border bg-background [&>section]:h-full [&>section]:min-h-0">
        <TicketEventSeatMapExperience
          :seats="venuePreviewSeats"
          :action-label="null"
          mode="admin"
          @seat-click="inspectedVenueSeat = $event"
        />
      </div>

      <div
        role="separator"
        tabindex="0"
        class="flex items-center justify-center"
        :class="isDesktopViewport ? 'cursor-col-resize' : 'cursor-row-resize'"
        @pointerdown="startResizing"
      >
        <Separator
          :orientation="isDesktopViewport ? 'vertical' : 'horizontal'"
          :class="isDesktopViewport ? 'h-16' : 'w-16'"
        />
      </div>

      <Card class="h-full min-h-0 overflow-hidden py-0">
        <form
          id="venue-detail-form"
          class="flex h-full min-h-0 flex-col"
          @submit.prevent="onSubmit"
        >
          <CardHeader class="flex flex-wrap gap-2 pt-3">
            <Button
              type="button"
              size="sm"
              :variant="activeConfigTab === 'details' ? 'default' : 'outline'"
              @click="activeConfigTab = 'details'"
            >
              <Building2 />
              {{ $t('admin_venue_detail.tab_details') }}
            </Button>
            <Button
              type="button"
              size="sm"
              :variant="activeConfigTab === 'layout' ? 'default' : 'outline'"
              @click="activeConfigTab = 'layout'"
            >
              <LayoutGrid />
              {{ $t('admin_venue_detail.tab_layout') }}
            </Button>
            <Button
              type="button"
              size="sm"
              :variant="activeConfigTab === 'events' ? 'default' : 'outline'"
              @click="activeConfigTab = 'events'"
            >
              <CalendarRange />
              {{ $t('admin_venue_detail.tab_events') }}
            </Button>
          </CardHeader>

          <CardContent class="min-h-0 flex-1 overflow-y-auto py-4">
            <Alert
              v-if="inspectedVenueSeat"
              class="relative mb-4 pr-12"
            >
              <AlertTitle>
                {{ inspectedVenueSeat.section.name }} · Row {{ inspectedVenueSeat.row.label }} · Seat {{ inspectedVenueSeat.seat.seatLabelSnapshot }}
              </AlertTitle>
              <AlertDescription>
                X {{ inspectedVenueSeat.seat.displayX ?? 0 }} · Y {{ inspectedVenueSeat.seat.displayY ?? 0 }}
              </AlertDescription>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                class="absolute right-2 top-2"
                aria-label="Dismiss inspected seat"
                @click="inspectedVenueSeat = null"
              >
                <X />
              </Button>
            </Alert>

            <div
              v-if="activeConfigTab === 'details'"
              class="space-y-4"
            >
              <FieldGroup>
                <VeeField
                  v-slot="{ field, errors }"
                  name="name"
                >
                  <Field :data-invalid="!!errors.length">
                    <FieldLabel for="edit-venue-name">
                      {{ $t('admin_venue_detail.venue_name_label') }}
                    </FieldLabel>
                    <Input
                      id="edit-venue-name"
                      :model-value="field.value"
                      :placeholder="$t('admin.venues.venue_name_placeholder')"
                      :aria-invalid="!!errors.length"
                      @update:model-value="field.onChange"
                    />
                    <FieldError
                      v-if="errors.length"
                      :errors="errors"
                    />
                  </Field>
                </VeeField>

                <VeeField
                  v-slot="{ field, errors }"
                  name="slug"
                >
                  <Field :data-invalid="!!errors.length">
                    <FieldLabel for="edit-venue-slug">
                      {{ $t('admin.venues.slug') }}
                    </FieldLabel>
                    <Input
                      id="edit-venue-slug"
                      :model-value="field.value"
                      :placeholder="$t('admin.venues.slug_placeholder')"
                      :aria-invalid="!!errors.length"
                      @update:model-value="field.onChange"
                    />
                    <FieldError
                      v-if="errors.length"
                      :errors="errors"
                    />
                  </Field>
                </VeeField>

                <VeeField
                  v-slot="{ field, errors }"
                  name="address"
                >
                  <Field :data-invalid="!!errors.length">
                    <FieldLabel for="edit-venue-address">
                      {{ $t('admin.venues.address') }}
                    </FieldLabel>
                    <Input
                      id="edit-venue-address"
                      :model-value="field.value"
                      :placeholder="$t('admin.venues.address_placeholder')"
                      :aria-invalid="!!errors.length"
                      @update:model-value="field.onChange"
                    />
                    <FieldError
                      v-if="errors.length"
                      :errors="errors"
                    />
                  </Field>
                </VeeField>

                <div class="grid gap-4 md:grid-cols-2">
                  <VeeField
                    v-slot="{ field, errors }"
                    name="city"
                  >
                    <Field :data-invalid="!!errors.length">
                      <FieldLabel for="edit-venue-city">
                        {{ $t('admin.venues.city') }}
                      </FieldLabel>
                      <Input
                        id="edit-venue-city"
                        :model-value="field.value"
                        :aria-invalid="!!errors.length"
                        @update:model-value="field.onChange"
                      />
                      <FieldError
                        v-if="errors.length"
                        :errors="errors"
                      />
                    </Field>
                  </VeeField>

                  <VeeField
                    v-slot="{ field, errors }"
                    name="country"
                  >
                    <Field :data-invalid="!!errors.length">
                      <FieldLabel for="edit-venue-country">
                        {{ $t('admin.venues.country') }}
                      </FieldLabel>
                      <Input
                        id="edit-venue-country"
                        :model-value="field.value"
                        :aria-invalid="!!errors.length"
                        @update:model-value="field.onChange"
                      />
                      <FieldError
                        v-if="errors.length"
                        :errors="errors"
                      />
                    </Field>
                  </VeeField>
                </div>

                <VeeField
                  v-slot="{ field, errors }"
                  name="description"
                >
                  <Field :data-invalid="!!errors.length">
                    <FieldLabel for="edit-venue-description">
                      {{ $t('admin.venues.description') }}
                    </FieldLabel>
                    <Textarea
                      id="edit-venue-description"
                      :model-value="field.value"
                      :placeholder="$t('admin_venue_detail.optional_notes_placeholder')"
                      :aria-invalid="!!errors.length"
                      @update:model-value="field.onChange"
                    />
                    <FieldError
                      v-if="errors.length"
                      :errors="errors"
                    />
                  </Field>
                </VeeField>

                <VeeField
                  v-slot="{ field, errors }"
                  name="coverImage"
                >
                  <Field :data-invalid="!!errors.length">
                    <FieldLabel for="edit-venue-cover-image">
                      {{ $t('admin_venue_detail.cover_image_label') }}
                    </FieldLabel>
                    <Input
                      id="edit-venue-cover-image"
                      :model-value="field.value"
                      :placeholder="$t('admin.venues.cover_image_placeholder')"
                      :aria-invalid="!!errors.length"
                      @update:model-value="field.onChange"
                    />
                    <FieldDescription>{{ $t('common.optional') }}</FieldDescription>
                    <FieldError
                      v-if="errors.length"
                      :errors="errors"
                    />
                  </Field>
                </VeeField>
              </FieldGroup>

              <AdminLocalizationAdminVenueLocalizationPanel :venue-id="venueDetail.venue.id" />
            </div>

            <div
              v-else-if="activeConfigTab === 'layout'"
              class="space-y-4"
            >
              <div class="grid gap-3 xl:grid-cols-3">
                <Card
                  v-for="preset in blueprintPresets"
                  :key="preset.id"
                  class="gap-3 py-4"
                >
                  <CardContent class="space-y-3 px-4">
                    <div>
                      <p class="text-sm font-medium">
                        {{ preset.label }}
                      </p>
                      <p class="text-xs text-muted-foreground">
                        {{ preset.description }}
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      @click="applyBlueprintPreset(preset)"
                    >
                      Apply
                    </Button>
                  </CardContent>
                </Card>
              </div>

              <Separator />

              <AdminVenuesVenueSeatLayoutEditor v-model:sections="sectionLayouts" />
            </div>

            <div
              v-else
              class="space-y-4"
            >
              <div class="grid gap-3 md:grid-cols-2">
                <Card class="gap-2 py-3">
                  <CardContent class="px-4">
                    <p class="text-xs text-muted-foreground">
                      Dependencies
                    </p>
                    <p class="text-sm font-medium">
                      {{ linkedEvents.length }} linked events
                    </p>
                  </CardContent>
                </Card>
                <Card class="gap-2 py-3">
                  <CardContent class="px-4">
                    <p class="text-xs text-muted-foreground">
                      Rule
                    </p>
                    <p class="text-sm font-medium">
                      Future launches only
                    </p>
                  </CardContent>
                </Card>
              </div>

              <Card class="gap-3 py-4">
                <CardContent class="grid gap-3 px-4 md:grid-cols-3">
                  <div>
                    <p class="text-xs text-muted-foreground">
                      Capacity
                    </p>
                    <p class="text-sm font-medium">
                      {{ totalCapacity }} seats
                    </p>
                  </div>
                  <div>
                    <p class="text-xs text-muted-foreground">
                      Largest
                    </p>
                    <p class="text-sm font-medium">
                      {{ largestSection?.name ?? 'Not set' }}
                    </p>
                  </div>
                  <div>
                    <p class="text-xs text-muted-foreground">
                      Snapshot
                    </p>
                    <p class="text-sm font-medium">
                      Existing seats stay frozen
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Separator />

              <div class="space-y-3">
                <p class="text-sm font-medium">
                  Linked events
                </p>

                <div
                  v-if="linkedEvents.length > 0"
                  class="space-y-3"
                >
                  <Card
                    v-for="event in linkedEvents"
                    :key="event.id"
                    class="gap-2 py-3 transition-colors hover:bg-muted/30"
                  >
                    <CardContent class="px-4">
                      <NuxtLink
                        :to="`/admin/events/${event.id}`"
                        class="flex items-center justify-between gap-4"
                      >
                        <div>
                          <p class="text-sm font-medium">{{ event.title }}</p>
                          <p class="text-xs text-muted-foreground">{{ formatDateTime(event.startsAt) }}</p>
                        </div>
                        <p class="text-xs text-muted-foreground">{{ event.status }}</p>
                      </NuxtLink>
                    </CardContent>
                  </Card>
                </div>

                <Card
                  v-else
                  class="py-6"
                >
                  <CardContent class="px-4 text-sm text-muted-foreground">
                    No linked events.
                  </CardContent>
                </Card>
              </div>
            </div>
          </CardContent>
        </form>
      </Card>
    </section>
  </main>
</template>
