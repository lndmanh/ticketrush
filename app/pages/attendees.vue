<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { Field as VeeField, useForm } from 'vee-validate'
import { toast } from 'vue-sonner'
import { DateFormatter, getLocalTimeZone, parseDate } from '@internationalized/date'
import type { DateValue } from '@internationalized/date'
import { apiRequest } from '@/utils/apiRequest'
import { parseApiError } from '@/utils/apiError'
import { apiRoutes } from '#shared/apiRoutes'
import { savedAttendeeFormSchema } from '#shared/schemas/savedAttendeeSchema'
import { SavedAttendeeGender } from '#shared/commonEnums'
import { getMissingSelfAttendeeFields, SelfAttendeeRequirement } from '#shared/utils/selfAttendee'
import type { ApiResponse } from '~~/types/api'
import type { DeletedPayload } from '~~/types/common'
import type { SavedAttendeeModel } from '~~/types/models/saved-attendee'
import { PlusIcon, UserIcon, Trash2Icon, Edit2Icon, CalendarDays } from '@lucide/vue'

const attendeesResponse = ref<ApiResponse<SavedAttendeeModel[]> | null>(null)
const loading = ref(true)
const fetchError = ref<string | null>(null)

const attendees = computed(() => {
  const data = attendeesResponse.value?.success ? attendeesResponse.value.data : []
  return [...data].sort((left, right) => {
    if (left.isSelf !== right.isSelf) {
      return left.isSelf ? -1 : 1
    }

    return left.id - right.id
  })
})

const isDialogOpen = ref(false)
const isSubmitting = ref(false)
const editingId = ref<number | null>(null)
const { t, locale } = useI18n()

type AttendeeFormValues = {
  legalName: string
  preferredName?: string
  email?: string
  phone?: string
  birthDate?: string
  gender: SavedAttendeeGender
  guardianName?: string
  guardianEmail?: string
  guardianPhone?: string
  notes?: string
  accessibilityNeeds?: string
}

const defaultValues: AttendeeFormValues = {
  legalName: '',
  preferredName: '',
  email: '',
  phone: '',
  birthDate: undefined,
  gender: SavedAttendeeGender.PreferNotToSay,
  guardianName: '',
  guardianEmail: '',
  guardianPhone: '',
  notes: '',
  accessibilityNeeds: '',
}

const { handleSubmit, resetForm, setFieldValue, values: formValues } = useForm<AttendeeFormValues>({
  initialValues: defaultValues,
  validationSchema: savedAttendeeFormSchema,
})

async function refresh() {
  loading.value = true
  fetchError.value = null

  try {
    const response = await apiRequest<ApiResponse<SavedAttendeeModel[]>>(apiRoutes.SAVED_ATTENDEES)
    if (!response.success) throw response
    attendeesResponse.value = response
  }
  catch (error) {
    fetchError.value = parseApiError(error, 'Failed to load attendees. Please try again.').message
  }
  finally {
    loading.value = false
  }
}

onMounted(() => {
  refresh()
})

const dateFormatter = computed(() => new DateFormatter(locale.value, { dateStyle: 'medium' }))

const birthDateValue = computed<DateValue | undefined>({
  get: () => parseBirthDateValue(formValues.birthDate),
  set: (value) => {
    setFieldValue('birthDate', value ? value.toString() : undefined)
  },
})

const birthDateLabel = computed(() => {
  if (!birthDateValue.value) {
    return t('saved_attendees.birth_date')
  }

  return dateFormatter.value.format(birthDateValue.value.toDate(getLocalTimeZone()))
})

const showGuardianFields = computed(() => isMinor(formValues.birthDate))

watch(showGuardianFields, (shouldShowGuardianFields) => {
  if (shouldShowGuardianFields) return

  setFieldValue('guardianName', undefined)
  setFieldValue('guardianEmail', undefined)
  setFieldValue('guardianPhone', undefined)
})

function parseBirthDateValue(value?: string | null) {
  if (!value) {
    return undefined
  }

  try {
    return parseDate(value)
  }
  catch {
    return undefined
  }
}

function clearBirthDate() {
  setFieldValue('birthDate', undefined)
}

function openCreateDialog() {
  editingId.value = null
  resetForm({ values: { ...defaultValues } })
  isDialogOpen.value = true
}

type AttendeeItem = {
  id: number
  legalName: string
  preferredName?: string | null
  email?: string | null
  phone?: string | null
  birthDate?: string | Date | null
  gender?: SavedAttendeeGender | null
  guardianName?: string | null
  guardianEmail?: string | null
  guardianPhone?: string | null
  notes?: string | null
  accessibilityNeeds?: string | null
  isSelf?: boolean | null
}

async function openEditDialog(attendee: AttendeeItem) {
  editingId.value = attendee.id

  let formattedBirthDate: string | undefined = undefined
  if (attendee.birthDate) {
    const d = new Date(attendee.birthDate)
    if (!isNaN(d.getTime())) {
      formattedBirthDate = d.toISOString().split('T')[0]
    }
  }

  isDialogOpen.value = true
  await nextTick()

  resetForm({
    values: {
      legalName: attendee.legalName,
      preferredName: attendee.preferredName || undefined,
      email: attendee.email || undefined,
      phone: attendee.phone || undefined,
      birthDate: formattedBirthDate,
      gender: attendee.gender || SavedAttendeeGender.PreferNotToSay,
      guardianName: attendee.guardianName || undefined,
      guardianEmail: attendee.guardianEmail || undefined,
      guardianPhone: attendee.guardianPhone || undefined,
      notes: attendee.notes || undefined,
      accessibilityNeeds: attendee.accessibilityNeeds || undefined,
    },
  })
}

const onSubmit = handleSubmit(async (values) => {
  isSubmitting.value = true
  try {
    const payload: AttendeeFormValues = showGuardianFields.value
      ? values
      : {
          ...values,
          guardianName: undefined,
          guardianEmail: undefined,
          guardianPhone: undefined,
        }

    if (editingId.value) {
      const response = await apiRequest<ApiResponse<SavedAttendeeModel | null>>(apiRoutes.savedAttendee(editingId.value), {
        method: 'PATCH',
        body: payload,
      })
      if (!response.success) throw response
      toast.success(t('saved_attendees.updated'))
    }
    else {
      const response = await apiRequest(apiRoutes.SAVED_ATTENDEES, {
        method: 'POST',
        body: payload,
      })
      if (!response.success) throw response
      toast.success(t('saved_attendees.saved'))
    }
    isDialogOpen.value = false
    await refresh()
  }
  catch (error) {
    toast.error(parseApiError(error, t('saved_attendees.save_failed')).message)
  }
  finally {
    isSubmitting.value = false
  }
})

async function deleteAttendee(id: number) {
  if (!window.confirm(t('saved_attendees.delete_confirm'))) {
    return
  }

  try {
    const response = await apiRequest<ApiResponse<DeletedPayload>>(apiRoutes.savedAttendee(id), {
      method: 'DELETE',
    })
    if (!response.success) throw response
    toast.success(t('saved_attendees.deleted'))
    await refresh()
  }
  catch (error) {
    toast.error(parseApiError(error, t('saved_attendees.delete_failed')).message)
  }
}

function getInitials(name: string) {
  return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() || '?'
}

function isMinor(birthDate?: Date | string | null) {
  if (!birthDate) return false
  const date = new Date(birthDate)
  if (isNaN(date.getTime())) return false

  const today = new Date()
  let age = today.getFullYear() - date.getFullYear()
  const m = today.getMonth() - date.getMonth()
  if (m < 0 || (m === 0 && today.getDate() < date.getDate())) {
    age--
  }
  return age < 18
}

function getMissingSelfFields(attendee: AttendeeItem) {
  if (!attendee.isSelf) {
    return []
  }

  return getMissingSelfAttendeeFields({
    legalName: attendee.legalName,
    email: attendee.email ?? null,
    phone: attendee.phone ?? null,
    birthDate: attendee.birthDate ?? null,
    gender: attendee.gender ?? null,
  })
}

function getMissingSelfFieldLabel(field: SelfAttendeeRequirement) {
  const labels: Record<SelfAttendeeRequirement, string> = {
    [SelfAttendeeRequirement.LegalName]: 'legal name',
    [SelfAttendeeRequirement.Email]: 'email',
    [SelfAttendeeRequirement.Phone]: 'phone',
    [SelfAttendeeRequirement.BirthDate]: 'birth date',
    [SelfAttendeeRequirement.Gender]: 'gender',
  }

  return labels[field]
}

const selfAttendeeMissingFields = computed(() => {
  const self = attendees.value.find(a => a.isSelf)
  if (!self) return []
  return getMissingSelfFields(self).map(getMissingSelfFieldLabel)
})

definePageMeta({
  title: 'saved_attendees.page_title',
  breadcrumb: 'saved_attendees.breadcrumb',
  layout: 'dashboard',
  middleware: ['auth'],
})
</script>

<template>
  <div class="space-y-6">
    <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
      <div>
        <h1 class="text-3xl font-bold tracking-tight">
          {{ $t('saved_attendees.title') }}
        </h1>
        <p class="text-muted-foreground mt-1">
          {{ $t('saved_attendees.subtitle') }}
        </p>
      </div>
      <div class="flex gap-2">
        <Button
          :disabled="loading"
          @click="openCreateDialog"
        >
          <PlusIcon class="size-4" />
          Add Attendee
        </Button>
      </div>
    </div>

    <!-- Self Attendee Missing Fields Alert -->
    <Alert
      v-if="selfAttendeeMissingFields.length > 0"
      variant="destructive"
    >
      <AlertDescription>
        Complete required profile fields before booking: {{ selfAttendeeMissingFields.join(', ') }}.
      </AlertDescription>
    </Alert>

    <!-- Loading State -->
    <div
      v-if="loading"
      class="grid gap-4 md:grid-cols-2 lg:grid-cols-3"
    >
      <Card
        v-for="i in 3"
        :key="i"
        class="animate-pulse flex flex-col justify-between"
      >
        <div class="p-6 space-y-4">
          <div class="flex items-center space-x-4">
            <div class="w-12 h-12 bg-muted rounded-full" />
            <div class="space-y-2">
              <div class="h-4 bg-muted rounded w-24" />
              <div class="h-3 bg-muted rounded w-32" />
            </div>
          </div>
          <div class="space-y-2 pt-2">
            <div class="h-3 bg-muted rounded w-full" />
            <div class="h-3 bg-muted rounded w-4/5" />
          </div>
        </div>
      </Card>
    </div>

    <!-- Error State -->
    <div
      v-else-if="fetchError"
      class="text-center py-12 px-4 border rounded-xl bg-destructive/10 border-destructive/20 border-dashed"
    >
      <h3 class="text-lg font-semibold text-destructive mb-1">
        {{ $t('saved_attendees.loading_failed') }}
      </h3>
      <p class="text-muted-foreground mb-6 max-w-sm mx-auto">
        {{ $t('saved_attendees.loading_failed_desc') }}
      </p>
      <div class="flex justify-center">
        <Button
          variant="outline"
          @click="refresh()"
        >
          {{ $t('saved_attendees.retry') }}
        </Button>
      </div>
    </div>

    <!-- Empty State -->
    <Empty
      v-else-if="attendees.length === 0"
      class="border border-dashed"
    >
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <UserIcon />
        </EmptyMedia>
        <EmptyTitle>{{ $t('saved_attendees.no_attendees') }}</EmptyTitle>
        <EmptyDescription>{{ $t('saved_attendees.no_attendees_desc') }}</EmptyDescription>
      </EmptyHeader>
    </Empty>

    <!-- Grid View -->
    <ItemGroup
      v-else
      class="grid gap-4 md:grid-cols-2 lg:grid-cols-3"
    >
      <Item
        v-for="attendee in attendees"
        :key="attendee.id"
        variant="outline"
        class="items-start"
      >
        <ItemMedia variant="icon">
          {{ getInitials(attendee.preferredName || attendee.legalName) }}
        </ItemMedia>

        <ItemContent class="min-w-0">
          <div class="flex items-start gap-2">
            <ItemTitle class="max-w-full truncate">
              {{ attendee.preferredName || attendee.legalName }}
            </ItemTitle>
            <Badge
              v-if="attendee.isSelf"
              variant="secondary"
            >
              Self
            </Badge>
          </div>

          <ItemDescription v-if="attendee.preferredName">
            Legal: {{ attendee.legalName }}
          </ItemDescription>
          <ItemDescription v-if="attendee.email">
            {{ attendee.email }}
          </ItemDescription>
          <ItemDescription v-if="attendee.phone">
            {{ attendee.phone }}
          </ItemDescription>
          <ItemDescription v-if="!attendee.email && !attendee.phone">
            No direct contact info
          </ItemDescription>
          <ItemDescription v-if="attendee.guardianName">
            Guardian: {{ attendee.guardianName }}
          </ItemDescription>

          <Badge
            v-if="isMinor(attendee.birthDate)"
            variant="outline"
          >
            Minor
          </Badge>
        </ItemContent>

        <ItemActions class="w-full justify-end sm:w-auto">
          <Button
            variant="ghost"
            size="sm"
            @click="openEditDialog(attendee)"
          >
            <Edit2Icon class="w-4 h-4 mr-1.5" />
            Edit
          </Button>
          <Button
            v-if="!attendee.isSelf"
            variant="ghost"
            size="sm"
            class="text-destructive hover:text-destructive"
            @click="deleteAttendee(attendee.id)"
          >
            <Trash2Icon class="w-4 h-4 mr-1.5" />
            Delete
          </Button>
        </ItemActions>
      </Item>
    </ItemGroup>

    <!-- Create/Edit Dialog -->
    <Dialog v-model:open="isDialogOpen">
      <DialogScrollContent class="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>{{ editingId ? t('saved_attendees.dialog_edit_title') : t('saved_attendees.dialog_add_title') }}</DialogTitle>
          <DialogDescription>
            {{ $t('saved_attendees.dialog_desc') }}
          </DialogDescription>
        </DialogHeader>

        <form
          class="space-y-6 py-4"
          @submit.prevent="onSubmit"
        >
          <FieldGroup>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <VeeField
                v-slot="{ field, errors }"
                name="legalName"
              >
                <Field :data-invalid="!!errors.length">
                  <FieldLabel>{{ $t('saved_attendees.legal_name') }}</FieldLabel>
                  <Input
                    v-bind="field"
                    :placeholder="$t('saved_attendees.legal_name_placeholder')"
                  />
                  <FieldError
                    v-if="errors.length"
                    :errors="errors"
                  />
                </Field>
              </VeeField>

              <VeeField
                v-slot="{ field, errors }"
                name="preferredName"
              >
                <Field :data-invalid="!!errors.length">
                  <FieldLabel>{{ $t('saved_attendees.preferred_name') }}</FieldLabel>
                  <Input
                    v-bind="field"
                    :placeholder="$t('saved_attendees.preferred_name_placeholder')"
                  />
                  <FieldError
                    v-if="errors.length"
                    :errors="errors"
                  />
                </Field>
              </VeeField>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <VeeField
                v-slot="{ field, errors }"
                name="email"
              >
                <Field :data-invalid="!!errors.length">
                  <FieldLabel>{{ $t('saved_attendees.email') }}</FieldLabel>
                  <Input
                    v-bind="field"
                    type="email"
                    :placeholder="$t('saved_attendees.email_placeholder')"
                  />
                  <FieldError
                    v-if="errors.length"
                    :errors="errors"
                  />
                </Field>
              </VeeField>

              <VeeField
                v-slot="{ field, errors }"
                name="phone"
                :validate-on-input="true"
              >
                <Field :data-invalid="!!errors.length">
                  <FieldLabel>{{ $t('saved_attendees.phone') }}</FieldLabel>
                  <Input
                    v-bind="field"
                    type="tel"
                    placeholder="+1234567890"
                    :aria-invalid="!!errors.length"
                  />
                  <FieldError
                    v-if="errors.length"
                    :errors="errors"
                  />
                </Field>
              </VeeField>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <VeeField
                v-slot="{ field, errors }"
                name="birthDate"
              >
                <Field :data-invalid="!!errors.length">
                  <FieldLabel for="attendee-birth-date">
                    {{ $t('saved_attendees.birth_date') }}
                  </FieldLabel>
                  <Popover>
                    <PopoverTrigger as-child>
                      <Button
                        id="attendee-birth-date"
                        type="button"
                        variant="outline"
                        class="w-full justify-start font-normal"
                        :class="!field.value && 'text-muted-foreground'"
                        :aria-invalid="!!errors.length"
                      >
                        <CalendarDays data-icon="inline-start" />
                        <span class="truncate">{{ birthDateLabel }}</span>
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent
                      align="start"
                      class="w-auto p-0"
                    >
                      <Calendar
                        v-model="birthDateValue"
                        initial-focus
                        layout="month-and-year"
                      />
                      <div
                        v-if="field.value"
                        class="border-t p-3"
                      >
                        <Button
                          type="button"
                          variant="ghost"
                          class="w-full"
                          @click="clearBirthDate"
                        >
                          {{ $t('events.clear_date') }}
                        </Button>
                      </div>
                    </PopoverContent>
                  </Popover>
                  <FieldError
                    v-if="errors.length"
                    :errors="errors"
                  />
                </Field>
              </VeeField>

              <VeeField
                v-slot="{ field, value, errors }"
                name="gender"
              >
                <Field :data-invalid="!!errors.length">
                  <FieldLabel>{{ $t('saved_attendees.gender') }}</FieldLabel>
                  <Select
                    :model-value="value"
                    @update:model-value="field.onChange"
                  >
                    <SelectTrigger>
                      <SelectValue :placeholder="$t('saved_attendees.gender_placeholder')" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem :value="SavedAttendeeGender.Female">
                        {{ $t('saved_attendees.gender_female') }}
                      </SelectItem>
                      <SelectItem :value="SavedAttendeeGender.Male">
                        {{ $t('saved_attendees.gender_male') }}
                      </SelectItem>
                      <SelectItem :value="SavedAttendeeGender.NonBinary">
                        {{ $t('saved_attendees.gender_non_binary') }}
                      </SelectItem>
                      <SelectItem :value="SavedAttendeeGender.PreferNotToSay">
                        {{ $t('saved_attendees.gender_prefer_not') }}
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

            <div
              v-if="showGuardianFields"
              class="pt-4 border-t"
            >
              <h4 class="text-sm font-medium mb-3">
                {{ $t('saved_attendees.guardian_section') }}
              </h4>
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <VeeField
                  v-slot="{ field, errors }"
                  name="guardianName"
                >
                  <Field :data-invalid="!!errors.length">
                    <FieldLabel>{{ $t('saved_attendees.guardian_name') }}</FieldLabel>
                    <Input
                      v-bind="field"
                      :placeholder="$t('saved_attendees.guardian_name_placeholder')"
                    />
                    <FieldError
                      v-if="errors.length"
                      :errors="errors"
                    />
                  </Field>
                </VeeField>

                <VeeField
                  v-slot="{ field, errors }"
                  name="guardianPhone"
                  :validate-on-input="true"
                >
                  <Field :data-invalid="!!errors.length">
                    <FieldLabel>{{ $t('saved_attendees.guardian_phone') }}</FieldLabel>
                    <Input
                      v-bind="field"
                      type="tel"
                      :aria-invalid="!!errors.length"
                    />
                    <FieldError
                      v-if="errors.length"
                      :errors="errors"
                    />
                  </Field>
                </VeeField>

                <div class="md:col-span-2">
                  <VeeField
                    v-slot="{ field, errors }"
                    name="guardianEmail"
                  >
                    <Field :data-invalid="!!errors.length">
                      <FieldLabel>{{ $t('saved_attendees.guardian_email') }}</FieldLabel>
                      <Input
                        v-bind="field"
                        type="email"
                      />
                      <FieldError
                        v-if="errors.length"
                        :errors="errors"
                      />
                    </Field>
                  </VeeField>
                </div>
              </div>
            </div>

            <div class="pt-4 border-t space-y-4">
              <h4 class="text-sm font-medium">
                {{ $t('saved_attendees.additional_section') }}
              </h4>

              <VeeField
                v-slot="{ field, errors }"
                name="accessibilityNeeds"
              >
                <Field :data-invalid="!!errors.length">
                  <FieldLabel>{{ $t('saved_attendees.accessibility') }}</FieldLabel>
                  <Textarea
                    v-bind="field"
                    :placeholder="$t('saved_attendees.accessibility_placeholder')"
                    class="resize-none h-20"
                  />
                  <FieldError
                    v-if="errors.length"
                    :errors="errors"
                  />
                </Field>
              </VeeField>

              <VeeField
                v-slot="{ field, errors }"
                name="notes"
              >
                <Field :data-invalid="!!errors.length">
                  <FieldLabel>{{ $t('saved_attendees.notes') }}</FieldLabel>
                  <Textarea
                    v-bind="field"
                    :placeholder="$t('saved_attendees.notes_placeholder')"
                    class="resize-none h-20"
                  />
                  <FieldError
                    v-if="errors.length"
                    :errors="errors"
                  />
                </Field>
              </VeeField>
            </div>
          </FieldGroup>

          <DialogFooter>
            <Button
              variant="outline"
              type="button"
              :disabled="isSubmitting"
              @click="isDialogOpen = false"
            >
              {{ $t('saved_attendees.cancel') }}
            </Button>
            <Button
              type="submit"
              :is-loading="isSubmitting"
            >
              {{ editingId ? $t('saved_attendees.save_changes') : $t('saved_attendees.add_attendee') }}
            </Button>
          </DialogFooter>
        </form>
      </DialogScrollContent>
    </Dialog>
  </div>
</template>
