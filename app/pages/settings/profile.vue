<script setup lang="ts">
import { CalendarDays, X, AlertTriangle } from '@lucide/vue'
import { DateFormatter, getLocalTimeZone, parseDate } from '@internationalized/date'
import type { DateValue } from '@internationalized/date'
import { toast } from 'vue-sonner'
import { Field as VeeField, useForm } from 'vee-validate'
import { SavedAttendeeGender } from '#shared/commonEnums'
import { apiRoutes } from '#shared/apiRoutes'
import { updateProfileSchema } from '#shared/schemas/userSchema'
import type { UpdateProfileInput } from '#shared/schemas/userSchema'
import { apiRequest } from '@/utils/apiRequest'
import { parseApiError } from '@/utils/apiError'
import type { ApiResponse } from '~~/types/api'
import type { ProfileUpdateData, UserProfileModel } from '~~/types/models/profile'

definePageMeta({
  title: 'account_page.title',
  breadcrumb: 'account_page.breadcrumb',
  middleware: 'auth',
  layout: 'dashboard',
  fullWidth: false,
})

const { t, locale } = useI18n()

const { data: profileResponse, refresh: refreshProfile } = await useAPI<ApiResponse<UserProfileModel>>(() => apiRoutes.MY_PROFILE)

const showDeleteAccountDialog = ref(false)

function confirmDeleteAccount() {
  showDeleteAccountDialog.value = true
}

async function deleteAccount() {
  showDeleteAccountDialog.value = false
  try {
    const res = await apiRequest('/api/users/me', { method: 'DELETE' })
    if (!res.success) {
      throw res
    }
    else {
      await navigateTo('/')
    }
  }
  catch (error) {
    toast.error(parseApiError(error, 'Failed to delete account:').message)
  }
}

const profile = computed(() => profileResponse.value?.success ? profileResponse.value.data : null)
const isSaving = ref(false)

const DEFAULT_COUNTRY_CODE = '+84'
const countryCodeOptions = [DEFAULT_COUNTRY_CODE, '+1', '+81', '+82']
const countryCode = ref(DEFAULT_COUNTRY_CODE)

const defaultProfileValues: UpdateProfileInput = {
  name: '',
  email: '',
  phone: null,
  birthDate: null,
  gender: SavedAttendeeGender.PreferNotToSay,
}

const genderOptions: { value: SavedAttendeeGender, label: string }[] = [
  { value: SavedAttendeeGender.Male, label: 'saved_attendees.gender_male' },
  { value: SavedAttendeeGender.Female, label: 'saved_attendees.gender_female' },
  { value: SavedAttendeeGender.NonBinary, label: 'saved_attendees.gender_non_binary' },
  { value: SavedAttendeeGender.PreferNotToSay, label: 'saved_attendees.gender_prefer_not' },
]

const dateFormatter = computed(() => new DateFormatter(locale.value, { dateStyle: 'medium' }))

const {
  handleSubmit: handleProfileSubmit,
  resetForm: resetProfileForm,
  setFieldError: setProfileFieldError,
  setFieldValue: setProfileFieldValue,
  values: profileValues,
  meta: profileMeta,
} = useForm<UpdateProfileInput>({
  initialValues: { ...defaultProfileValues },
  validationSchema: updateProfileSchema,
})

const birthDateValue = computed<DateValue | undefined>({
  get: () => parseBirthDateValue(profileValues.birthDate),
  set: (value) => {
    setProfileFieldValue('birthDate', value ? value.toString() : null)
  },
})

const birthDateLabel = computed(() => {
  if (!birthDateValue.value) {
    return t('account_page.birth_date')
  }

  return dateFormatter.value.format(birthDateValue.value.toDate(getLocalTimeZone()))
})

function parseBirthDateValue(value: string | null) {
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

function formatBirthDate(value: Date | string | null) {
  if (!value) {
    return null
  }

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return null
  }

  return date.toISOString().slice(0, 10)
}

function splitPhone(value: string | null): { countryCode: string, phone: string | null } {
  if (!value) {
    return { countryCode: DEFAULT_COUNTRY_CODE, phone: null }
  }

  const trimmed = value.trim()
  const matchedCountryCode = countryCodeOptions.find(code => trimmed.startsWith(code))

  if (matchedCountryCode) {
    return {
      countryCode: matchedCountryCode,
      phone: trimmed.slice(matchedCountryCode.length).trim() || null,
    }
  }

  return { countryCode: DEFAULT_COUNTRY_CODE, phone: trimmed }
}

function normalizeGender(value: string | null): SavedAttendeeGender {
  return genderOptions.find(option => option.value === value)?.value ?? SavedAttendeeGender.PreferNotToSay
}

function createProfileFormValues(value: UserProfileModel, phone: string | null): UpdateProfileInput {
  return {
    name: value.name || '',
    email: value.email || '',
    phone,
    birthDate: formatBirthDate(value.birthDate),
    gender: normalizeGender(value.gender),
  }
}

function syncProfileToForm(value: UserProfileModel | null) {
  if (!value) {
    return
  }

  const phoneParts = splitPhone(value.phone)
  countryCode.value = phoneParts.countryCode

  resetProfileForm({ values: createProfileFormValues(value, phoneParts.phone) })
}

watch(profile, syncProfileToForm, { immediate: true })

function getProfilePayload(formValues: UpdateProfileInput): UpdateProfileInput {
  const phone = formValues.phone?.trim()

  return {
    name: formValues.name.trim(),
    email: formValues.email.trim(),
    phone: phone ? `${countryCode.value} ${phone}` : null,
    birthDate: formValues.birthDate || null,
    gender: formValues.gender,
  }
}

const onSaveProfile = handleProfileSubmit(async (formValues) => {
  if (isSaving.value || !profile.value) {
    return
  }

  isSaving.value = true

  try {
    const response = await apiRequest<ApiResponse<ProfileUpdateData>>(`/api/users/${profile.value.id}/profile`, {
      method: 'PATCH',
      body: getProfilePayload(formValues),
    })

    if (!response.success) {
      throw response
    }

    toast.success(t('account_page.saved_toast'))
    await refreshProfile()
  }
  catch (error) {
    const message = parseApiError(error, t('account_page.save_error')).message

    if (message.toLowerCase().includes('email')) {
      setProfileFieldError('email', message)
      return
    }

    toast.error(message)
  }
  finally {
    isSaving.value = false
  }
}, ({ errors }) => {
  const message = Object.values(errors).flat().filter(Boolean)[0] || t('account_page.save_error')
  toast.error(message)
})

function clearBirthDate() {
  setProfileFieldValue('birthDate', null)
}
</script>

<template>
  <div class="flex flex-col gap-4">
    <div class="flex flex-col gap-1">
      <h1 class="text-2xl font-semibold tracking-tight">
        {{ $t('account_page.title') }}
      </h1>
      <p class="text-sm text-muted-foreground">
        {{ $t('account_page.description') }}
      </p>
    </div>

    <Card>
      <CardContent>
        <form @submit.prevent="onSaveProfile">
          <FieldGroup>
            <VeeField
              v-slot="{ field, errors }"
              name="name"
            >
              <Field :data-invalid="!!errors.length">
                <FieldLabel for="account-name">
                  {{ $t('account_page.full_name') }}
                </FieldLabel>
                <Input
                  id="account-name"
                  :model-value="field.value"
                  :placeholder="$t('account_page.full_name')"
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
              name="email"
            >
              <Field :data-invalid="!!errors.length">
                <FieldLabel for="account-email">
                  {{ $t('account_page.email') }}
                </FieldLabel>
                <Input
                  id="account-email"
                  :model-value="field.value"
                  type="email"
                  :placeholder="$t('account_page.email')"
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
              name="phone"
            >
              <Field :data-invalid="!!errors.length">
                <FieldLabel for="account-phone">
                  {{ $t('account_page.phone') }}
                </FieldLabel>
                <InputGroup>
                  <InputGroupAddon>
                    <Select v-model="countryCode">
                      <SelectTrigger
                        class="h-8 border-0 bg-transparent shadow-none"
                        :aria-label="$t('account_page.country_code')"
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          <SelectItem
                            v-for="code in countryCodeOptions"
                            :key="code"
                            :value="code"
                          >
                            {{ code }}
                          </SelectItem>
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  </InputGroupAddon>
                  <InputGroupInput
                    id="account-phone"
                    :model-value="field.value || ''"
                    inputmode="tel"
                    :placeholder="$t('account_page.phone')"
                    :aria-invalid="!!errors.length"
                    @update:model-value="value => field.onChange(String(value).trim() || null)"
                  />
                  <InputGroupAddon
                    v-if="field.value"
                    align="inline-end"
                  >
                    <InputGroupButton
                      type="button"
                      variant="ghost"
                      size="icon-xs"
                      :aria-label="$t('account_page.clear_phone')"
                      @click="field.onChange(null)"
                    >
                      <X />
                    </InputGroupButton>
                  </InputGroupAddon>
                </InputGroup>
                <FieldDescription>{{ $t('common.optional') }}</FieldDescription>
                <FieldError
                  v-if="errors.length"
                  :errors="errors"
                />
              </Field>
            </VeeField>

            <FieldGroup class="gap-4 sm:grid sm:grid-cols-2">
              <VeeField
                v-slot="{ field, errors }"
                name="birthDate"
              >
                <Field :data-invalid="!!errors.length">
                  <FieldLabel for="account-birth-date">
                    {{ $t('account_page.birth_date') }}
                  </FieldLabel>
                  <Popover>
                    <PopoverTrigger as-child>
                      <Button
                        id="account-birth-date"
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
                  <FieldDescription>{{ $t('common.optional') }}</FieldDescription>
                  <FieldError
                    v-if="errors.length"
                    :errors="errors"
                  />
                </Field>
              </VeeField>

              <VeeField
                v-slot="{ field, errors }"
                name="gender"
              >
                <Field :data-invalid="!!errors.length">
                  <FieldLabel for="account-gender">
                    {{ $t('account_page.gender') }}
                  </FieldLabel>
                  <Select
                    :model-value="field.value || SavedAttendeeGender.PreferNotToSay"
                    @update:model-value="field.onChange"
                  >
                    <SelectTrigger
                      id="account-gender"
                      :aria-invalid="!!errors.length"
                    >
                      <SelectValue :placeholder="$t('account_page.gender')" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectItem
                          v-for="option in genderOptions"
                          :key="option.value"
                          :value="option.value"
                        >
                          {{ $t(option.label) }}
                        </SelectItem>
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                  <FieldError
                    v-if="errors.length"
                    :errors="errors"
                  />
                </Field>
              </VeeField>
            </FieldGroup>

            <div class="flex justify-end gap-2">
              <Button
                type="submit"
                :is-loading="isSaving"
                :disabled="isSaving || !profileMeta.valid"
              >
                {{ $t('account_page.complete') }}
              </Button>
            </div>
          </FieldGroup>
        </form>
      </CardContent>
    </Card>

    <div class="bg-destructive/2">
      <div class="flex flex-col md:flex-row md:items-center justify-between gap-6 p-6 rounded-2xl border border-destructive/20 bg-background shadow-sm">
        <div class="space-y-2">
          <div class="flex items-center gap-2 text-destructive font-bold">
            <AlertTriangle class="w-5 h-5" />
            <CardTitle>Permanently Delete Account</CardTitle>
          </div>
          <CardDescription>
            Once you delete your account, there is no going back. Please be certain.
            All your data will be permanently removed.
          </CardDescription>
        </div>
        <Button
          variant="destructive"
          class="shadow-lg shadow-destructive/20"
          @click="confirmDeleteAccount"
        >
          Delete Account
        </Button>
      </div>
    </div>

    <!-- Delete Account Dialog -->
    <AlertDialog
      :open="showDeleteAccountDialog"
      @update:open="showDeleteAccountDialog = false"
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Account</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete your account? This will permanently delete all your data and cannot be
            undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel @click="showDeleteAccountDialog = false">
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            @click="deleteAccount"
          >
            Delete Account
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </div>
</template>
