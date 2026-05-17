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
import {
  type VenueLayoutPreset,
  getVenueLayoutPresetSummary,
  getVenueLayoutPresetSections,
  venueLayoutPresets,
} from '@/lib/venueLayoutPresets'
import { apiRequest } from '@/utils/apiRequest'
import { parseApiError } from '@/utils/apiError'
import { getDisplayDateLocale } from '@/lib/localizedEvents'
import { formatDateTime } from '@/lib/utils'
import { apiRoutes } from '#shared/apiRoutes'
import { getCountryOptions, getVietnamProvinceCityOptions, VIETNAM_COUNTRY_VALUE } from '#shared/constants/location'

interface AdminEventListItem {
  id: number
  title: string
  status: string
  venueId: number
  startsAt: string | Date
}

const { locale, t } = useI18n()
const displayLocale = computed(() => getDisplayDateLocale(locale.value))
const countryOptions = computed(() => getCountryOptions(locale.value))
const cityOptions = computed(() => getVietnamProvinceCityOptions(locale.value))

type ConfigTab = 'details' | 'layout' | 'events'

const venueIdentitySchema = createVenueSchema.omit({ sections: true })
type VenueIdentityInput = z.infer<typeof venueIdentitySchema>

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
  country: VIETNAM_COUNTRY_VALUE,
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
const isPresetDialogOpen = ref(false)

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
      gridX: section.gridX,
      gridY: section.gridY,
      gridW: section.gridW,
      gridH: section.gridH,
      seatLayoutMode: section.seatLayoutMode,
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
    gridX: section.gridX,
    gridY: section.gridY,
    gridW: section.gridW,
    gridH: section.gridH,
    seatLayoutMode: section.seatLayoutMode,
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

function applyBlueprintPreset(preset: VenueLayoutPreset) {
  sectionLayouts.value = getVenueLayoutPresetSections(preset).map((section, sectionIndex) => ({
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
  isPresetDialogOpen.value = false
}

const onSubmit = handleSubmit(
  async (formValues) => {
    const payload = {
      ...formValues,
      sections: sectionLayouts.value,
    }

    const validation = createVenueSchema.safeParse(payload)
    if (!validation.success) {
      toast.error(t(validation.error.issues[0]?.message || 'admin_venue_detail.fix_blueprint'))
      return
    }

    isSaving.value = true
    try {
      const response = await apiRequest<ApiResponse<VenueDetail>>(apiRoutes.adminVenue(venueId.value), {
        method: 'PUT',
        body: validation.data,
      })
      if (!response.success) throw response

      toast.success(t('admin_venue_detail.updated'))
      savedVenueSnapshot.value = currentVenueSnapshot.value
      await refreshVenue()
    }
    catch (error) {
      toast.error(t(parseApiError(error, 'admin_venue_detail.update_failed').message))
    }
    finally {
      isSaving.value = false
    }
  },
  ({ errors }) => {
    const firstError = Object.values(errors).flat().filter(Boolean)[0] || 'admin_venue_detail.fix_highlighted_fields'
    toast.error(t(firstError))
  },
)

definePageMeta({
  title: 'admin_venue_detail.page_title',
  breadcrumb: 'admin_venue_detail.breadcrumb',
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

    <section class="grid min-h-0 grid-cols-1 gap-3 overflow-y-auto p-3 md:p-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] lg:overflow-hidden">
      <div class="min-h-[22rem] min-w-0 overflow-hidden lg:h-full lg:min-h-0 [&>section]:h-full [&>section]:min-h-0">
        <TicketEventSeatMapExperience
          :seats="venuePreviewSeats"
          :action-label="null"
          mode="admin"
          @seat-click="inspectedVenueSeat = $event"
        />
      </div>

      <Card class="min-h-[28rem] min-w-0 overflow-hidden py-0 lg:h-full lg:min-h-0">
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
                {{ $t('admin_venue_detail.inspected_seat_title', { section: inspectedVenueSeat.section.name, row: inspectedVenueSeat.row.label, seat: inspectedVenueSeat.seat.seatLabelSnapshot }) }}
              </AlertTitle>
              <AlertDescription>
                X {{ inspectedVenueSeat.seat.displayX ?? 0 }} · Y {{ inspectedVenueSeat.seat.displayY ?? 0 }}
              </AlertDescription>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                class="absolute right-2 top-2"
                :aria-label="$t('admin_venue_detail.dismiss_inspected_seat')"
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
                      <Select
                        :model-value="field.value"
                        @update:model-value="field.onChange"
                      >
                        <SelectTrigger
                          id="edit-venue-city"
                          :aria-invalid="!!errors.length"
                          @blur="field.onBlur"
                        >
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem
                            v-for="option in cityOptions"
                            :key="option.value"
                            :value="option.value"
                          >
                            {{ option.label }}
                          </SelectItem>
                        </SelectContent>
                      </Select>
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
                      <Select
                        :model-value="field.value"
                        @update:model-value="field.onChange"
                      >
                        <SelectTrigger
                          id="edit-venue-country"
                          :aria-invalid="!!errors.length"
                          @blur="field.onBlur"
                        >
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem
                            v-for="option in countryOptions"
                            :key="option.value"
                            :value="option.value"
                          >
                            {{ option.label }}
                          </SelectItem>
                        </SelectContent>
                      </Select>
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
              class="h-full min-h-0"
            >
              <Dialog v-model:open="isPresetDialogOpen">
                <AdminVenuesVenueSeatLayoutEditor v-model:sections="sectionLayouts">
                  <template #toolbar-start>
                    <DialogTrigger as-child>
                      <Button
                        type="button"
                        variant="outline"
                      >
                        {{ $t('admin_venue_detail.presets') }}
                      </Button>
                    </DialogTrigger>
                  </template>
                </AdminVenuesVenueSeatLayoutEditor>
                <DialogScrollContent class="max-w-5xl">
                  <DialogHeader>
                    <DialogTitle>{{ $t('admin_venue_detail.presets_title') }}</DialogTitle>
                    <DialogDescription>
                      {{ $t('admin_venue_detail.presets_desc') }}
                    </DialogDescription>
                  </DialogHeader>
                  <div class="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                    <Card
                      v-for="preset in venueLayoutPresets"
                      :key="preset.id"
                    >
                      <CardHeader>
                        <CardTitle>
                          {{ preset.name }}
                        </CardTitle>
                        <CardDescription>
                          {{ preset.description }}
                        </CardDescription>
                      </CardHeader>
                      <CardContent class="space-y-2 text-sm">
                        <p>{{ getVenueLayoutPresetSummary(preset) }}</p>
                      </CardContent>
                      <CardFooter>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          @click="applyBlueprintPreset(preset)"
                        >
                          {{ $t('admin_venue_detail.apply_preset') }}
                        </Button>
                      </CardFooter>
                    </Card>
                  </div>
                </DialogScrollContent>
              </Dialog>
            </div>

            <div
              v-else
              class="space-y-4"
            >
              <div class="grid gap-3 md:grid-cols-2">
                <Card class="gap-2 py-3">
                  <CardContent class="px-4">
                    <p class="text-xs text-muted-foreground">
                      {{ $t('admin_venue_detail.dependencies_label') }}
                    </p>
                    <p class="text-sm font-medium">
                      {{ $t('admin_venue_detail.linked_events_count', { count: linkedEvents.length }) }}
                    </p>
                  </CardContent>
                </Card>
                <Card class="gap-2 py-3">
                  <CardContent class="px-4">
                    <p class="text-xs text-muted-foreground">
                      {{ $t('admin_venue_detail.rule_label') }}
                    </p>
                    <p class="text-sm font-medium">
                      {{ $t('admin_venue_detail.future_launches_only') }}
                    </p>
                  </CardContent>
                </Card>
              </div>

              <Card class="gap-3 py-4">
                <CardContent class="grid gap-3 px-4 md:grid-cols-3">
                  <div>
                    <p class="text-xs text-muted-foreground">
                      {{ $t('admin_venue_detail.capacity_label') }}
                    </p>
                    <p class="text-sm font-medium">
                      {{ $t('admin_venue_detail.capacity_seats', { count: totalCapacity }) }}
                    </p>
                  </div>
                  <div>
                    <p class="text-xs text-muted-foreground">
                      {{ $t('admin_venue_detail.largest_label') }}
                    </p>
                    <p class="text-sm font-medium">
                      {{ largestSection?.name ?? $t('admin_venue_detail.not_set') }}
                    </p>
                  </div>
                  <div>
                    <p class="text-xs text-muted-foreground">
                      {{ $t('admin_venue_detail.snapshot_label') }}
                    </p>
                    <p class="text-sm font-medium">
                      {{ $t('admin_venue_detail.snapshot_desc') }}
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Separator />

              <div class="space-y-3">
                <p class="text-sm font-medium">
                  {{ $t('admin_venue_detail.linked_events_title') }}
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
                          <p class="text-xs text-muted-foreground">{{ formatDateTime(event.startsAt, displayLocale) }}</p>
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
                    {{ $t('admin_venue_detail.no_linked_events') }}
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
