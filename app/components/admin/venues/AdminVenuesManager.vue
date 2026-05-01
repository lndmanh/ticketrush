<template>
  <div class="space-y-6">
    <section class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
      <div class="space-y-1">
        <h2 class="text-2xl font-semibold text-foreground">
          Venues
        </h2>
        <p class="text-sm text-muted-foreground">
          Manage reusable room layouts and blueprint coverage.
        </p>
      </div>

      <Button @click="openCreateDialog">
        <Rows3 class="h-4 w-4" />
        Add venue
      </Button>
    </section>

    <DataTable
      ref="dataTableRef"
      :columns="columns"
      :data="venues"
      :loading="tableLoading"
      search-placeholder="Search venues, cities, or addresses"
      empty-title="No venue blueprints match the current view."
      empty-description="Adjust the search or add a new venue."
      @update:data="fetchVenues"
    />

    <Dialog v-model:open="showDialog">
      <DialogScrollContent class="max-w-3xl">
        <DialogHeader>
          <DialogTitle>
            {{ isEditing ? 'Edit venue' : 'Create venue' }}
          </DialogTitle>
          <DialogDescription>
            Venue details and section matrix.
          </DialogDescription>
        </DialogHeader>

        <form
          class="space-y-6"
          @submit.prevent="onSubmit"
        >
          <FieldGroup>
            <VeeField
              v-slot="{ field, errors }"
              name="name"
            >
              <Field :data-invalid="!!errors.length">
                <FieldLabel for="venue-dialog-name">
                  Venue name
                </FieldLabel>
                <Input
                  id="venue-dialog-name"
                  :model-value="field.value"
                  placeholder="Saigon Sound Hall"
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
                <FieldLabel for="venue-dialog-slug">
                  Slug
                </FieldLabel>
                <Input
                  id="venue-dialog-slug"
                  :model-value="field.value"
                  placeholder="saigon-sound-hall"
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
                <FieldLabel for="venue-dialog-address">
                  Address
                </FieldLabel>
                <Input
                  id="venue-dialog-address"
                  :model-value="field.value"
                  placeholder="District 1, Ho Chi Minh City"
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
                  <FieldLabel for="venue-dialog-city">
                    City
                  </FieldLabel>
                  <Input
                    id="venue-dialog-city"
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
                  <FieldLabel for="venue-dialog-country">
                    Country
                  </FieldLabel>
                  <Input
                    id="venue-dialog-country"
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
                <FieldLabel for="venue-dialog-description">
                  Description
                </FieldLabel>
                <Textarea
                  id="venue-dialog-description"
                  :model-value="field.value"
                  placeholder="A room tuned for premium lines of sight."
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
                <FieldLabel for="venue-dialog-cover-image">
                  Cover image URL
                </FieldLabel>
                <Input
                  id="venue-dialog-cover-image"
                  :model-value="field.value"
                  placeholder="https://example.com/venue.jpg"
                  :aria-invalid="!!errors.length"
                  @update:model-value="field.onChange"
                />
                <FieldDescription>Optional</FieldDescription>
                <FieldError
                  v-if="errors.length"
                  :errors="errors"
                />
              </Field>
            </VeeField>
          </FieldGroup>

          <FieldSet class="space-y-4">
            <div class="flex items-center justify-between gap-4">
              <div>
                <FieldLegend>Section matrix</FieldLegend>
                <FieldDescription>Rows and seats per section.</FieldDescription>
              </div>
              <Button
                type="button"
                variant="outline"
                @click="addSection"
              >
                Add section
              </Button>
            </div>

            <div class="space-y-4">
              <div
                v-for="(section, index) in values.sections"
                :key="`${section.code}-${index}`"
                class="rounded-md border p-4"
              >
                <div class="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
                  <Field>
                    <FieldLabel :for="`venue-dialog-section-code-${index}`">
                      Code
                    </FieldLabel>
                    <Input
                      :id="`venue-dialog-section-code-${index}`"
                      :model-value="section.code"
                      @update:model-value="updateSection(index, 'code', $event)"
                    />
                  </Field>
                  <Field>
                    <FieldLabel :for="`venue-dialog-section-name-${index}`">
                      Name
                    </FieldLabel>
                    <Input
                      :id="`venue-dialog-section-name-${index}`"
                      :model-value="section.name"
                      @update:model-value="updateSection(index, 'name', $event)"
                    />
                  </Field>
                  <Field>
                    <FieldLabel :for="`venue-dialog-section-color-${index}`">
                      Color
                    </FieldLabel>
                    <Input
                      :id="`venue-dialog-section-color-${index}`"
                      :model-value="section.color"
                      @update:model-value="updateSection(index, 'color', $event)"
                    />
                  </Field>
                  <Field>
                    <FieldLabel :for="`venue-dialog-section-rows-${index}`">
                      Rows
                    </FieldLabel>
                    <Input
                      :id="`venue-dialog-section-rows-${index}`"
                      :model-value="String(section.rowCount)"
                      type="number"
                      min="1"
                      @update:model-value="updateSection(index, 'rowCount', Number($event))"
                    />
                  </Field>
                  <Field>
                    <FieldLabel :for="`venue-dialog-section-seats-${index}`">
                      Seats per row
                    </FieldLabel>
                    <Input
                      :id="`venue-dialog-section-seats-${index}`"
                      :model-value="String(section.seatsPerRow)"
                      type="number"
                      min="1"
                      @update:model-value="updateSection(index, 'seatsPerRow', Number($event))"
                    />
                  </Field>
                </div>

                <div class="mt-4 flex items-center justify-between gap-3 rounded-md border bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
                  <span>{{ section.rowCount * section.seatsPerRow }} seats staged for {{ section.name }}.</span>
                  <Button
                    type="button"
                    variant="ghost"
                    @click="removeSection(index)"
                  >
                    Remove
                  </Button>
                </div>
              </div>
            </div>
          </FieldSet>

          <DialogFooter>
            <Button
              variant="outline"
              type="button"
              :disabled="dialogLoading"
              @click="closeDialog"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              :is-loading="dialogLoading"
            >
              {{ isEditing ? 'Save changes' : 'Create venue' }}
            </Button>
          </DialogFooter>
        </form>
      </DialogScrollContent>
    </Dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { Field as VeeField, useForm } from 'vee-validate'
import { toast } from 'vue-sonner'
import type { Venue } from '#shared/db'
import type { ApiResponse } from '~~/server/utils/apiResponse'
import { venueBuilderSchema } from '#shared/schemas/ticketingSchema'
import type { VenueBuilderInput } from '#shared/schemas/ticketingSchema'
import { MapPinned, Rows3, Ruler } from '@lucide/vue'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogScrollContent,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from '@/components/ui/field'
import DataTable from '@/components/DataTable.vue'
import { createColumns } from './columns'

interface VenueDetailResponse {
  venue: Venue
  sections: Array<{
    id: number
    code: string
    name: string
    color: string
    rows: Array<{ seats: Array<{ id: number }> }>
  }>
}

function extractErrorMessage(error: unknown, fallback: string) {
  if (typeof error === 'object' && error !== null && 'data' in error) {
    const data = error.data
    if (typeof data === 'object' && data !== null) {
      if ('statusMessage' in data && typeof data.statusMessage === 'string') {
        return data.statusMessage
      }
      if ('message' in data && typeof data.message === 'string') {
        return data.message
      }
    }
  }

  if (error instanceof Error && error.message) {
    return error.message
  }

  return fallback
}

const dataTableRef = ref()
const venues = ref<Venue[]>([])
const tableLoading = ref(false)
const dialogLoading = ref(false)
const showDialog = ref(false)
const editingVenueId = ref<number | null>(null)

const defaultValues: VenueBuilderInput = {
  slug: '',
  name: '',
  description: '',
  city: 'Ho Chi Minh City',
  country: 'Vietnam',
  address: '',
  coverImage: '',
  sections: [
    { code: 'VIP', name: 'Front Row', color: '#0F766E', rowCount: 4, seatsPerRow: 8 },
    { code: 'GA', name: 'Main Floor', color: '#334155', rowCount: 8, seatsPerRow: 12 },
  ],
}

const isEditing = computed(() => editingVenueId.value !== null)
const cityCoverage = computed(() => new Set(venues.value.map(venue => venue.city)).size)
const largestVenue = computed(() => [...venues.value].sort((left, right) => right.capacity - left.capacity)[0] ?? null)

const {
  handleSubmit,
  resetForm,
  setFieldValue,
  values,
} = useForm({
  initialValues: { ...defaultValues },
  validationSchema: venueBuilderSchema,
})

function buildVenuePayload(formValues: VenueBuilderInput) {
  return {
    ...formValues,
    sections: formValues.sections.map((section, index) => ({
      code: section.code,
      name: section.name,
      color: section.color,
      sortOrder: index,
      rows: Array.from({ length: section.rowCount }, (_, rowIndex) => ({
        label: String.fromCharCode(65 + rowIndex),
        sortOrder: rowIndex,
        seats: Array.from({ length: section.seatsPerRow }, (_, seatIndex) => ({
          label: `${seatIndex + 1}`,
          seatNumber: seatIndex + 1,
          x: seatIndex,
          y: rowIndex,
          sortOrder: seatIndex,
          accessibilityLabel: `${String.fromCharCode(65 + rowIndex)}-${seatIndex + 1}`,
          isAccessible: false,
        })),
      })),
    })),
  }
}

function updateSection(index: number, key: keyof VenueBuilderInput['sections'][number], value: string | number) {
  setFieldValue('sections', values.sections.map((section, sectionIndex) => {
    if (sectionIndex !== index) {
      return section
    }

    return {
      ...section,
      [key]: value,
    }
  }))
}

function addSection() {
  setFieldValue('sections', [
    ...values.sections,
    { code: 'NEW', name: 'New section', color: '#0F766E', rowCount: 4, seatsPerRow: 8 },
  ])
}

function removeSection(index: number) {
  if (values.sections.length === 1) {
    return
  }

  setFieldValue('sections', values.sections.filter((_, sectionIndex) => sectionIndex !== index))
}

const onSubmit = handleSubmit(
  async (formValues) => {
    try {
      dialogLoading.value = true

      if (isEditing.value && editingVenueId.value !== null) {
        await $fetch(`/api/admin/venues/${editingVenueId.value}`, {
          method: 'PUT',
          body: buildVenuePayload(formValues),
        })
      }
      else {
        await $fetch('/api/admin/venues', {
          method: 'POST',
          body: buildVenuePayload(formValues),
        })
      }

      toast.success(isEditing.value ? 'Venue updated successfully' : 'Venue created successfully')
      closeDialog()
      await fetchVenues()
    }
    catch (error) {
      toast.error(extractErrorMessage(error, 'Failed to save the venue blueprint'))
    }
    finally {
      dialogLoading.value = false
    }
  },
  ({ errors }) => {
    const firstError = Object.values(errors).flat().filter(Boolean)[0] || 'Please fix the errors above'
    toast.error(firstError)
  },
)

async function fetchVenues() {
  try {
    tableLoading.value = true
    const response = await $fetch<ApiResponse<Venue[]>>('/api/admin/venues')
    if (!response.success) {
      throw new Error('Unsuccessful response')
    }
    venues.value = response.data
  }
  catch (error) {
    toast.error(extractErrorMessage(error, 'Failed to load venues'))
  }
  finally {
    tableLoading.value = false
  }
}

function openCreateDialog() {
  editingVenueId.value = null
  resetForm({ values: { ...defaultValues } })
  showDialog.value = true
}

async function openEditDialog(venue: Venue) {
  try {
    dialogLoading.value = true
    const detail = await $fetch<ApiResponse<VenueDetailResponse>>(`/api/admin/venues/${venue.id}`)
    editingVenueId.value = venue.id
    resetForm({
      values: {
        slug: detail.data.venue.slug,
        name: detail.data.venue.name,
        description: detail.data.venue.description ?? '',
        city: detail.data.venue.city,
        country: detail.data.venue.country,
        address: detail.data.venue.address,
        coverImage: detail.data.venue.coverImage ?? '',
        sections: detail.data.sections.map(section => ({
          code: section.code,
          name: section.name,
          color: section.color,
          rowCount: section.rows.length,
          seatsPerRow: section.rows[0]?.seats.length ?? 0,
        })),
      },
    })
    showDialog.value = true
  }
  catch (error) {
    toast.error(extractErrorMessage(error, 'Failed to load the venue blueprint'))
  }
  finally {
    dialogLoading.value = false
  }
}

function openStudio(venueId: number) {
  navigateTo(`/admin/venues/${venueId}`)
}

function closeDialog() {
  showDialog.value = false
  editingVenueId.value = null
  resetForm({ values: { ...defaultValues } })
}

const columns = computed(() => createColumns(openEditDialog, openStudio))

onMounted(() => {
  fetchVenues()
})
</script>
