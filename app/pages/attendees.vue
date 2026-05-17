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
import { SavedAttendeeGender, TicketHolderSource } from '#shared/commonEnums'
import { getMissingSelfAttendeeFields, SelfAttendeeRequirement } from '#shared/utils/selfAttendee'
import type { ApiResponse } from '~~/types/api'
import type { DeletedPayload } from '~~/types/common'
import type { SavedAttendeeModel } from '~~/types/models/saved-attendee'
import { PlusIcon, UserIcon, Trash2Icon, Edit2Icon, CalendarDays, PencilLine, UserRound, UsersRound } from '@lucide/vue'

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
const guardianSource = ref<TicketHolderSource>(TicketHolderSource.Manual)
const guardianSavedAttendeeId = ref<string | null>(null)
const { t, locale } = useI18n()

definePageMeta({
  title: 'saved_attendees.page_title',
  breadcrumb: 'saved_attendees.breadcrumb',
  layout: 'dashboard',
  middleware: ['auth'],
})

useSeo({
  title: computed(() => t('saved_attendees.page_title')),
  description: computed(() => t('saved_attendees.page_description')),
  type: 'website',
})

type AttendeeFormValues = {
  legalName: string
  preferredName?: string
  email: string
  phone: string
  birthDate: string | undefined
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
    fetchError.value = parseApiError(error, t('saved_attendees.loading_failed_desc')).message
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
const selfAttendee = computed(() => attendees.value.find(attendee => attendee.isSelf) ?? null)
const canUseSelfAsGuardian = computed(() => {
  const self = selfAttendee.value
  return Boolean(self && editingId.value !== self.id)
})
const guardianAttendeeOptions = computed(() => attendees.value.filter(attendee => attendee.id !== editingId.value))

watch(showGuardianFields, (shouldShowGuardianFields) => {
  if (shouldShowGuardianFields) return

  guardianSource.value = TicketHolderSource.Manual
  guardianSavedAttendeeId.value = null
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
  guardianSource.value = TicketHolderSource.Manual
  guardianSavedAttendeeId.value = null
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

function normalizeGuardianValue(value?: string | null) {
  return value?.trim() ?? ''
}

function hasGuardianDetails(attendee: AttendeeItem) {
  return Boolean(
    normalizeGuardianValue(attendee.guardianName)
    || normalizeGuardianValue(attendee.guardianEmail)
    || normalizeGuardianValue(attendee.guardianPhone),
  )
}

function guardianMatchesAttendee(guardian: AttendeeItem, candidate: AttendeeItem) {
  return normalizeGuardianValue(guardian.guardianName) === normalizeGuardianValue(candidate.legalName)
    && normalizeGuardianValue(guardian.guardianEmail) === normalizeGuardianValue(candidate.email)
    && normalizeGuardianValue(guardian.guardianPhone) === normalizeGuardianValue(candidate.phone)
}

function getGuardianSelection(attendee: AttendeeItem): { source: TicketHolderSource, savedAttendeeId: string | null } {
  if (!hasGuardianDetails(attendee)) {
    return { source: TicketHolderSource.Manual, savedAttendeeId: null }
  }

  const self = selfAttendee.value
  if (self && attendee.id !== self.id && guardianMatchesAttendee(attendee, self)) {
    return { source: TicketHolderSource.Account, savedAttendeeId: null }
  }

  const matchedAttendee = attendees.value.find((candidate) => {
    return candidate.id !== attendee.id && guardianMatchesAttendee(attendee, candidate)
  })

  if (matchedAttendee) {
    return { source: TicketHolderSource.SavedAttendee, savedAttendeeId: String(matchedAttendee.id) }
  }

  return { source: TicketHolderSource.Manual, savedAttendeeId: null }
}

function getGuardianAttendeeById(value: string | null | undefined) {
  if (!value) {
    return null
  }

  const attendeeId = Number(value)
  if (!Number.isInteger(attendeeId)) {
    return null
  }

  return guardianAttendeeOptions.value.find(attendee => attendee.id === attendeeId) ?? null
}

function applyGuardianDetails(attendee: AttendeeItem) {
  setFieldValue('guardianName', attendee.legalName)
  setFieldValue('guardianEmail', attendee.email ?? undefined)
  setFieldValue('guardianPhone', attendee.phone ?? undefined)
}

function setGuardianSource(source: TicketHolderSource) {
  if (source === TicketHolderSource.Account) {
    const self = selfAttendee.value
    if (!self || editingId.value === self.id) {
      guardianSource.value = TicketHolderSource.Manual
      guardianSavedAttendeeId.value = null
      return
    }

    guardianSource.value = TicketHolderSource.Account
    guardianSavedAttendeeId.value = null
    applyGuardianDetails(self)
    return
  }

  if (source === TicketHolderSource.SavedAttendee) {
    guardianSource.value = TicketHolderSource.SavedAttendee
    guardianSavedAttendeeId.value = null
    setFieldValue('guardianName', undefined)
    setFieldValue('guardianEmail', undefined)
    setFieldValue('guardianPhone', undefined)
    return
  }

  guardianSource.value = TicketHolderSource.Manual
  guardianSavedAttendeeId.value = null
}

function updateGuardianSavedAttendee(value: string | undefined) {
  const attendee = getGuardianAttendeeById(value)
  if (!attendee) {
    guardianSavedAttendeeId.value = null
    return
  }

  guardianSavedAttendeeId.value = String(attendee.id)
  applyGuardianDetails(attendee)
}

function getAttendeeOptionLabel(attendee: AttendeeItem) {
  return attendee.email ? `${attendee.legalName} · ${attendee.email}` : attendee.legalName
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
  const guardianSelection = getGuardianSelection(attendee)
  guardianSource.value = guardianSelection.source
  guardianSavedAttendeeId.value = guardianSelection.savedAttendeeId

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
  if (showGuardianFields.value && guardianSource.value === TicketHolderSource.SavedAttendee && !guardianSavedAttendeeId.value) {
    toast.error(t('saved_attendees.guardian_saved_attendee_required'))
    return
  }

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
    [SelfAttendeeRequirement.LegalName]: t('saved_attendees.missing_legal_name'),
    [SelfAttendeeRequirement.Email]: t('saved_attendees.missing_email'),
    [SelfAttendeeRequirement.Phone]: t('saved_attendees.missing_phone'),
    [SelfAttendeeRequirement.BirthDate]: t('saved_attendees.missing_birth_date'),
    [SelfAttendeeRequirement.Gender]: t('saved_attendees.missing_gender'),
  }

  return labels[field]
}

const selfAttendeeMissingFields = computed(() => {
  const self = selfAttendee.value
  if (!self) return []
  return getMissingSelfFields(self).map(getMissingSelfFieldLabel)
})

</script>

<template>
  <div class="space-y-6">
    <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
      <div class="flex flex-col gap-1">
        <h1 class="text-2xl font-semibold tracking-tight">
          {{ $t('saved_attendees.title') }}
        </h1>
        <p class="text-sm text-muted-foreground">
          {{ $t('saved_attendees.subtitle') }}
        </p>
      </div>
      <div class="flex gap-2">
        <Button
          :disabled="loading"
          @click="openCreateDialog"
        >
          <PlusIcon class="size-4" />
          {{ $t('saved_attendees.add_attendee') }}
        </Button>
      </div>
    </div>

    <!-- Self Attendee Missing Fields Alert -->
    <Alert
      v-if="selfAttendeeMissingFields.length > 0"
      variant="destructive"
    >
      <AlertDescription>
        {{ $t('saved_attendees.complete_required_profile', { fields: selfAttendeeMissingFields.join(', ') }) }}
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
              {{ $t('saved_attendees.self_badge') }}
            </Badge>
          </div>

          <ItemDescription v-if="attendee.preferredName">
            {{ $t('saved_attendees.legal_label', { name: attendee.legalName }) }}
          </ItemDescription>
          <ItemDescription v-if="attendee.email">
            {{ attendee.email }}
          </ItemDescription>
          <ItemDescription v-if="attendee.phone">
            {{ attendee.phone }}
          </ItemDescription>
          <ItemDescription v-if="!attendee.email && !attendee.phone">
            {{ $t('saved_attendees.no_contact') }}
          </ItemDescription>
          <ItemDescription v-if="attendee.guardianName">
            {{ $t('saved_attendees.guardian_prefix', { name: attendee.guardianName }) }}
          </ItemDescription>

          <Badge
            v-if="isMinor(attendee.birthDate)"
            variant="outline"
          >
            {{ $t('saved_attendees.minor_badge') }}
          </Badge>
        </ItemContent>

        <ItemActions class="w-full justify-end sm:w-auto">
          <Button
            variant="ghost"
            size="sm"
            @click="openEditDialog(attendee)"
          >
            <Edit2Icon class="w-4 h-4 mr-1.5" />
            {{ $t('saved_attendees.edit') }}
          </Button>
          <Button
            v-if="!attendee.isSelf"
            variant="ghost"
            size="sm"
            class="text-destructive hover:text-destructive"
            @click="deleteAttendee(attendee.id)"
          >
            <Trash2Icon class="w-4 h-4 mr-1.5" />
            {{ $t('saved_attendees.delete') }}
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
                :validate-on-input="true"
              >
                <Field :data-invalid="!!errors.length">
                  <FieldLabel>{{ $t('saved_attendees.legal_name') }}</FieldLabel>
                  <Input
                    v-bind="field"
                    :placeholder="$t('saved_attendees.legal_name_placeholder')"
                    :aria-invalid="!!errors.length"
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
                :validate-on-input="true"
              >
                <Field :data-invalid="!!errors.length">
                  <FieldLabel>{{ $t('saved_attendees.email') }}</FieldLabel>
                  <Input
                    v-bind="field"
                    type="email"
                    :placeholder="$t('saved_attendees.email_placeholder')"
                    :aria-invalid="!!errors.length"
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
                :validate-on-change="true"
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
                :validate-on-change="true"
              >
                <Field :data-invalid="!!errors.length">
                  <FieldLabel>{{ $t('saved_attendees.gender') }}</FieldLabel>
                  <Select
                    :model-value="value"
                    @update:model-value="field.onChange"
                  >
                    <SelectTrigger :aria-invalid="!!errors.length">
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
              class="pt-4 border-t space-y-4"
            >
              <h4 class="text-sm font-medium mb-3">
                {{ $t('saved_attendees.guardian_section') }}
              </h4>

              <div class="space-y-3">
                <div
                  class="grid grid-cols-1 gap-3 md:grid-cols-3"
                  role="radiogroup"
                  :aria-label="$t('saved_attendees.guardian_method')"
                >
                  <button
                    type="button"
                    role="radio"
                    :disabled="!canUseSelfAsGuardian"
                    :aria-checked="guardianSource === TicketHolderSource.Account"
                    :class="[
                      'inline-flex items-center justify-center gap-2 rounded-xl border px-3 py-2 text-sm font-medium transition',
                      guardianSource === TicketHolderSource.Account ? 'border-primary/30 bg-primary/10 text-primary' : 'bg-muted/20 text-muted-foreground hover:text-foreground',
                      !canUseSelfAsGuardian ? 'cursor-not-allowed opacity-50 hover:text-muted-foreground' : '',
                    ]"
                    @click="setGuardianSource(TicketHolderSource.Account)"
                  >
                    <UserRound class="size-4" />
                    {{ $t('saved_attendees.guardian_use_self') }}
                  </button>

                  <button
                    type="button"
                    role="radio"
                    :disabled="guardianAttendeeOptions.length === 0"
                    :aria-checked="guardianSource === TicketHolderSource.SavedAttendee"
                    :class="[
                      'inline-flex items-center justify-center gap-2 rounded-xl border px-3 py-2 text-sm font-medium transition',
                      guardianSource === TicketHolderSource.SavedAttendee ? 'border-primary/30 bg-primary/10 text-primary' : 'bg-muted/20 text-muted-foreground hover:text-foreground',
                      guardianAttendeeOptions.length === 0 ? 'cursor-not-allowed opacity-50 hover:text-muted-foreground' : '',
                    ]"
                    @click="setGuardianSource(TicketHolderSource.SavedAttendee)"
                  >
                    <UsersRound class="size-4" />
                    {{ $t('saved_attendees.guardian_select_attendee') }}
                  </button>

                  <button
                    type="button"
                    role="radio"
                    :aria-checked="guardianSource === TicketHolderSource.Manual"
                    :class="[
                      'inline-flex items-center justify-center gap-2 rounded-xl border px-3 py-2 text-sm font-medium transition',
                      guardianSource === TicketHolderSource.Manual ? 'border-primary/30 bg-primary/10 text-primary' : 'bg-muted/20 text-muted-foreground hover:text-foreground',
                    ]"
                    @click="setGuardianSource(TicketHolderSource.Manual)"
                  >
                    <PencilLine class="size-4" />
                    {{ $t('saved_attendees.guardian_enter_manually') }}
                  </button>
                </div>

                <FieldDescription v-if="guardianAttendeeOptions.length === 0">
                  {{ $t('saved_attendees.guardian_no_saved_attendees') }}
                </FieldDescription>

                <div
                  v-if="guardianSource === TicketHolderSource.SavedAttendee"
                  class="space-y-2"
                >
                  <FieldLabel for="guardian-saved-attendee">
                    {{ $t('saved_attendees.guardian_saved_attendee') }}
                  </FieldLabel>
                  <Select
                    :model-value="guardianSavedAttendeeId ?? undefined"
                    @update:model-value="value => updateGuardianSavedAttendee(typeof value === 'string' ? value : undefined)"
                  >
                    <SelectTrigger
                      id="guardian-saved-attendee"
                      class="w-full bg-background/60"
                    >
                      <SelectValue :placeholder="$t('saved_attendees.guardian_attendee_placeholder')" />
                    </SelectTrigger>
                    <SelectContent
                      position="item-aligned"
                      class="max-w-[calc(100vw-2rem)]"
                    >
                      <SelectItem
                        v-for="attendee in guardianAttendeeOptions"
                        :key="attendee.id"
                        :value="String(attendee.id)"
                        class="min-h-10 max-w-full"
                      >
                        {{ getAttendeeOptionLabel(attendee) }}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <VeeField
                  v-slot="{ field, errors }"
                  name="guardianName"
                >
                  <Field :data-invalid="!!errors.length">
                    <FieldLabel for="attendee-guardian-name">
                      {{ $t('saved_attendees.guardian_name') }}
                    </FieldLabel>
                    <Input
                      id="attendee-guardian-name"
                      v-bind="field"
                      :placeholder="$t('saved_attendees.guardian_name_placeholder')"
                      :readonly="guardianSource !== TicketHolderSource.Manual"
                      :aria-invalid="!!errors.length"
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
                    <FieldLabel for="attendee-guardian-phone">
                      {{ $t('saved_attendees.guardian_phone') }}
                    </FieldLabel>
                    <Input
                      id="attendee-guardian-phone"
                      v-bind="field"
                      type="tel"
                      :readonly="guardianSource !== TicketHolderSource.Manual"
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
                      <FieldLabel for="attendee-guardian-email">
                        {{ $t('saved_attendees.guardian_email') }}
                      </FieldLabel>
                      <Input
                        id="attendee-guardian-email"
                        v-bind="field"
                        type="email"
                        :readonly="guardianSource !== TicketHolderSource.Manual"
                        :aria-invalid="!!errors.length"
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
