<template>
  <div class="space-y-6">
    <section class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
      <div class="space-y-1">
        <h2 class="text-2xl font-semibold text-foreground">
          {{ $t('admin.venues.title') }}
        </h2>
        <p class="text-sm text-muted-foreground">
          {{ $t('admin.venues.desc') }}
        </p>
      </div>

      <Button @click="openCreateDialog">
        <Rows3 class="h-4 w-4" />
        {{ $t('admin.venues.add_venue') }}
      </Button>
    </section>

    <DataTable
      ref="dataTableRef"
      :columns="columns"
      :data="venues"
      :loading="tableLoading"
      :search-placeholder="$t('admin.venues.search_venues')"
      :empty-title="$t('admin.venues.no_match')"
      :empty-description="$t('admin.venues.no_match_desc')"
      :column-labels="columnLabels"
      @update:data="fetchVenues"
    />

    <Dialog v-model:open="showDialog">
      <DialogScrollContent class="max-w-3xl">
        <DialogHeader>
          <DialogTitle>
            {{ $t('admin.venues.create_venue') }}
          </DialogTitle>
          <DialogDescription>
            {{ $t('admin.venues.create_desc') }}
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
                  {{ $t('admin.venues.venue_name') }}
                </FieldLabel>
                <Input
                  id="venue-dialog-name"
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
                <FieldLabel for="venue-dialog-slug">
                  {{ $t('admin.venues.slug') }}
                </FieldLabel>
                <Input
                  id="venue-dialog-slug"
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
                <FieldLabel for="venue-dialog-address">
                  {{ $t('admin.venues.address') }}
                </FieldLabel>
                <Input
                  id="venue-dialog-address"
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
                  <FieldLabel for="venue-dialog-city">
                    {{ $t('admin.venues.city') }}
                  </FieldLabel>
                  <Select
                    :model-value="field.value"
                    @update:model-value="field.onChange"
                  >
                    <SelectTrigger
                      id="venue-dialog-city"
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
                  <FieldLabel for="venue-dialog-country">
                    {{ $t('admin.venues.country') }}
                  </FieldLabel>
                  <Select
                    :model-value="field.value"
                    @update:model-value="field.onChange"
                  >
                    <SelectTrigger
                      id="venue-dialog-country"
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
                <FieldLabel for="venue-dialog-description">
                  {{ $t('admin.venues.description') }}
                </FieldLabel>
                <Textarea
                  id="venue-dialog-description"
                  :model-value="field.value"
                  :placeholder="$t('admin.venues.description_placeholder')"
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
                  {{ $t('admin.venues.cover_image') }}
                </FieldLabel>
                <ImageUpload
                  id="venue-dialog-cover-image"
                  :model-value="field.value ?? ''"
                  :upload-kind="ImageUploadKind.Venue"
                  :aria-invalid="!!errors.length"
                  :disabled="dialogLoading"
                  @update:model-value="field.onChange"
                  @blur="field.onBlur"
                />
                <FieldDescription>{{ $t('common.optional') }}</FieldDescription>
                <FieldError
                  v-if="errors.length"
                  :errors="errors"
                />
              </Field>
            </VeeField>
          </FieldGroup>

          <DialogFooter>
            <Button
              variant="outline"
              type="button"
              :disabled="dialogLoading"
              @click="closeDialog"
            >
              {{ $t('common.cancel') }}
            </Button>
            <Button
              type="submit"
              :is-loading="dialogLoading"
            >
              {{ $t('admin.venues.create_venue') }}
            </Button>
          </DialogFooter>
        </form>
      </DialogScrollContent>
    </Dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { Field as VeeField, useForm } from 'vee-validate'
import { toast } from 'vue-sonner'
import { ImageUploadKind } from '#shared/constants/imageUpload'
import type { Venue } from '#shared/db'
import { venueBuilderSchema } from '#shared/schemas/ticketingSchema'
import type { VenueBuilderInput } from '#shared/schemas/ticketingSchema'
import { Rows3 } from '@lucide/vue'
import { getCountryOptions, getVietnamProvinceCityOptions, VIETNAM_COUNTRY_VALUE } from '#shared/constants/location'
import ImageUpload from '@/components/ui/image-upload/ImageUpload.vue'
import DataTable from '@/components/DataTable.vue'
import { getVenueLayoutPresetSections, venueLayoutPresets } from '@/lib/venueLayoutPresets'
import { apiRequest } from '@/utils/apiRequest'
import { parseApiError } from '@/utils/apiError'
import { apiRoutes } from '#shared/apiRoutes'
import { createColumns } from './columns'

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isIssueRecord(value: unknown): value is Record<string, unknown> {
  return isRecord(value) && ('message' in value || 'path' in value)
}

type VenueFieldName = 'slug' | 'name' | 'description' | 'city' | 'country' | 'address' | 'coverImage'
const venueFieldNames: VenueFieldName[] = ['slug', 'name', 'description', 'city', 'country', 'address', 'coverImage']

function isVenueFieldName(value: string): value is VenueFieldName {
  return venueFieldNames.some(field => field === value)
}

function getFieldFromPath(path: unknown): string | null {
  if (typeof path === 'string') {
    return path.split('.').filter(Boolean)[0] ?? null
  }

  if (Array.isArray(path)) {
    const first = path[0]
    return typeof first === 'string' ? first : null
  }

  return null
}

function getIssueList(error: unknown): unknown[] | null {
  if (!isRecord(error) || !isRecord(error.data)) {
    return null
  }

  const directIssues = error.data.issues
  if (Array.isArray(directIssues)) {
    return directIssues
  }

  if (isRecord(error.data.data) && Array.isArray(error.data.data.issues)) {
    return error.data.data.issues
  }

  return null
}

function getIssueFieldAndMessage(error: unknown): { field: VenueFieldName, message: string } | null {
  const issues = getIssueList(error)
  if (!issues) {
    return null
  }

  for (const issue of issues) {
    if (!isIssueRecord(issue)) {
      continue
    }

    const field = getFieldFromPath(issue.path)
    const message = typeof issue.message === 'string' && issue.message.trim() ? issue.message : null
    if (field && isVenueFieldName(field) && message) {
      return { field, message }
    }
  }

  return null
}

function mapVenueErrorToField(message: string): VenueFieldName | null {
  const lowerMessage = message.toLowerCase()
  if (lowerMessage.includes('slug')) {
    return 'slug'
  }
  if (lowerMessage.includes('name')) {
    return 'name'
  }

  return null
}

const dataTableRef = ref<InstanceType<typeof DataTable> | null>(null)
const venues = ref<Venue[]>([])
const tableLoading = ref(false)
const dialogLoading = ref(false)
const showDialog = ref(false)
const { locale, t } = useI18n()
const countryOptions = computed(() => getCountryOptions(locale.value))
const cityOptions = computed(() => getVietnamProvinceCityOptions(locale.value))
const columnLabels = computed(() => ({
  name: t('admin.columns.venue'),
  city: t('admin.venues.city'),
  address: t('admin.columns.address'),
  capacity: t('admin.columns.capacity'),
  updatedAt: t('admin.columns.updated'),
}))

function getDefaultVenueValues(): VenueBuilderInput {
  const firstPreset = venueLayoutPresets[0]

  if (!firstPreset) {
    throw new Error('Missing default venue layout preset')
  }

  return {
    slug: '',
    name: '',
    description: '',
    city: 'Ho Chi Minh City',
    country: VIETNAM_COUNTRY_VALUE,
    address: '',
    coverImage: '',
    sections: getVenueLayoutPresetSections(firstPreset),
  }
}

const {
  handleSubmit,
  resetForm,
  setFieldError,
} = useForm({
  initialValues: getDefaultVenueValues(),
  validationSchema: venueBuilderSchema,
})

const onSubmit = handleSubmit(
  async (formValues) => {
    try {
      dialogLoading.value = true
      const response = await apiRequest(apiRoutes.ADMIN_VENUES, {
        method: 'POST',
        body: formValues,
      })
      if (!response.success) throw response

      toast.success(t('admin.venues.created'))
      closeDialog()
      await fetchVenues()
    }
    catch (error) {
      const message = parseApiError(error, 'admin.venues.create_failed').message
      const structuredIssue = getIssueFieldAndMessage(error)
      if (structuredIssue) {
        setFieldError(structuredIssue.field, structuredIssue.message)
      }
      else {
        const mappedField = mapVenueErrorToField(message)
        if (mappedField) {
          setFieldError(mappedField, message)
        }
        else {
          toast.error(t(message))
        }
      }
    }
    finally {
      dialogLoading.value = false
    }
  },
  ({ errors }) => {
    const firstError = Object.values(errors).flat().filter(Boolean)[0] || 'admin.venues.fix_errors'
    toast.error(t(firstError))
  },
)

async function fetchVenues() {
  try {
    tableLoading.value = true
    const response = await apiRequest(apiRoutes.ADMIN_VENUES)
    if (!response.success) {
      throw response
    }
    venues.value = response.data
  }
  catch (error) {
    toast.error(t(parseApiError(error, 'admin.venues.load_failed').message))
  }
  finally {
    tableLoading.value = false
  }
}

function openCreateDialog() {
  resetForm({ values: getDefaultVenueValues() })
  showDialog.value = true
}

function openStudio(venueId: number) {
  navigateTo(`/admin/venues/${venueId}`)
}

function closeDialog() {
  showDialog.value = false
  resetForm({ values: getDefaultVenueValues() })
}

const columns = computed(() => createColumns(openStudio))

onMounted(() => {
  fetchVenues()
})
</script>
