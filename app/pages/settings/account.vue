<script setup lang="ts">
import { CalendarDays, CheckCircle2, Eye, EyeOff, KeyRound, Mail, Phone, UserRound, X } from '@lucide/vue'
import { toast } from 'vue-sonner'
import { Field as VeeField, useForm } from 'vee-validate'
import { SavedAttendeeGender } from '#shared/commonEnums'
import { apiRoutes } from '#shared/apiRoutes'
import { updateProfileSchema } from '#shared/schemas/profileSchema'
import type { UpdateProfileInput } from '#shared/schemas/profileSchema'
import { changePasswordSchema } from '#shared/schemas/userSchema'
import { Field, FieldError, FieldLabel } from '@/components/ui/field'
import { apiRequest } from '@/utils/apiRequest'
import { parseApiError } from '@/utils/apiError'
import { calculatePasswordStrength } from '@/utils/passwordValidation'
import type { ApiResponse } from '~~/types/api'
import type { ProfileUpdateData, UserProfileModel } from '~~/types/models/profile'

definePageMeta({
  title: 'account_page.title',
  breadcrumb: 'account_page.breadcrumb',
  middleware: 'auth',
  layout: 'dashboard',
})

const { t } = useI18n()

const { data: profileResponse, refresh: refreshProfile } = await useAPI<ApiResponse<UserProfileModel>>(() => apiRoutes.MY_PROFILE)

const profile = computed(() => profileResponse.value?.success ? profileResponse.value.data : null)
const isSaving = ref(false)
const showChangePasswordDialog = ref(false)
const savingPassword = ref(false)
const showCurrentPassword = ref(false)
const showNewPassword = ref(false)
const showConfirmPassword = ref(false)
const generalPasswordError = ref('')

const form = reactive({
  name: '',
  email: '',
  countryCode: '+84',
  phone: '',
  birthDate: '',
  gender: SavedAttendeeGender.PreferNotToSay,
})

const initial = computed(() => {
  const name = form.name.trim() || form.email.trim() || profile.value?.username || 'T'
  return name.charAt(0).toUpperCase()
})

const trimmedPhone = computed(() => form.phone.trim())
const phoneError = computed(() => {
  if (!trimmedPhone.value) {
    return ''
  }

  const normalized = trimmedPhone.value.replace(/[\s.-]/g, '')
  return /^\d{8,11}$/.test(normalized) ? '' : t('account_page.phone_error')
})

const emailError = computed(() => {
  if (!form.email.trim()) {
    return t('account_page.email_required')
  }

  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim()) ? '' : t('account_page.email_invalid')
})

const nameError = computed(() => form.name.trim().length > 0 ? '' : t('account_page.name_required'))

const canSubmit = computed(() => {
  return !isSaving.value && !nameError.value && !emailError.value && !phoneError.value
})

const {
  handleSubmit: handlePasswordSubmit,
  resetForm: resetPasswordForm,
  setFieldError: setPasswordFieldError,
  values: passwordValues,
  meta: passwordMeta,
} = useForm({
  initialValues: {
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  },
  validationSchema: changePasswordSchema,
})

const passwordStrength = computed(() => {
  return calculatePasswordStrength(passwordValues.newPassword || '')
})

function formatBirthDate(value: Date | string | null) {
  if (!value) {
    return ''
  }

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return ''
  }

  return date.toISOString().slice(0, 10)
}

function splitPhone(value: string | null) {
  if (!value) {
    return { countryCode: '+84', phone: '' }
  }

  const trimmed = value.trim()
  if (trimmed.startsWith('+84')) {
    return {
      countryCode: '+84',
      phone: trimmed.slice(3).trim(),
    }
  }

  return { countryCode: '+84', phone: trimmed }
}

function normalizeGender(value: string | null) {
  if (value === SavedAttendeeGender.Female || value === SavedAttendeeGender.Male || value === SavedAttendeeGender.NonBinary || value === SavedAttendeeGender.PreferNotToSay) {
    return value
  }

  return SavedAttendeeGender.PreferNotToSay
}

function syncProfileToForm(value: UserProfileModel | null) {
  if (!value) {
    return
  }

  const phoneParts = splitPhone(value.phone)
  form.name = value.name || ''
  form.email = value.email || ''
  form.countryCode = phoneParts.countryCode
  form.phone = phoneParts.phone
  form.birthDate = formatBirthDate(value.birthDate)
  form.gender = normalizeGender(value.gender)
}

watch(profile, syncProfileToForm, { immediate: true })

async function saveProfile() {
  if (isSaving.value || !profile.value) {
    return
  }

  try {
    const phone = form.phone.trim() ? `${form.countryCode} ${form.phone.trim()}` : null
    const payload: UpdateProfileInput = {
      name: form.name.trim(),
      email: form.email.trim(),
      phone,
      birthDate: form.birthDate || null,
      gender: form.gender,
    }

    if (!canSubmit.value) {
      toast.error(t('account_page.save_error'))
      return
    }

    const validation = updateProfileSchema.safeParse(payload)

    if (!validation.success) {
      toast.error(t('account_page.save_error'))
      return
    }

    isSaving.value = true

    const response = await apiRequest<ApiResponse<ProfileUpdateData>>(`/api/users/${profile.value.id}/profile`, {
      method: 'PATCH',
      body: validation.data,
    })

    if (!response.success) {
      throw response
    }

    toast.success(t('account_page.saved_toast'))
    await refreshProfile()
  }
  catch (error) {
    toast.error(parseApiError(error, t('account_page.save_error')).message)
  }
  finally {
    isSaving.value = false
  }
}

function openChangePasswordDialog() {
  resetPasswordForm()
  generalPasswordError.value = ''
  showCurrentPassword.value = false
  showNewPassword.value = false
  showConfirmPassword.value = false
  showChangePasswordDialog.value = true
}

const onChangePassword = handlePasswordSubmit(async (formValues) => {
  savingPassword.value = true
  generalPasswordError.value = ''

  try {
    await apiRequest('/api/users/me/password', {
      method: 'PATCH',
      body: {
        currentPassword: formValues.currentPassword,
        newPassword: formValues.newPassword,
        confirmPassword: formValues.confirmPassword,
      },
    })

    showChangePasswordDialog.value = false
    toast.success(t('security_page.password_changed'))
    resetPasswordForm()
  }
  catch (error: unknown) {
    const message = parseApiError(error, t('security_page.change_password_failed')).message

    if (message.toLowerCase().includes('current password')) {
      setPasswordFieldError('currentPassword', message)
    }
    else {
      generalPasswordError.value = message
    }
  }
  finally {
    savingPassword.value = false
  }
})
</script>

<template>
  <div class="relative min-h-[calc(100dvh-8rem)] overflow-hidden rounded-[2rem] border border-border/70 bg-card/80 px-4 py-8 text-foreground shadow-2xl shadow-primary/5 backdrop-blur sm:px-6 lg:px-10 dark:border-white/10 dark:bg-[#111315] dark:shadow-black/25">
    <div class="pointer-events-none absolute inset-0 z-0 bg-[radial-gradient(circle_at_20%_0%,hsl(var(--primary)/0.16),transparent_34%),radial-gradient(circle_at_78%_12%,hsl(var(--chart-2)/0.10),transparent_30%),linear-gradient(135deg,hsl(var(--background)/0.86),hsl(var(--muted)/0.46))] dark:bg-[radial-gradient(circle_at_20%_0%,hsl(var(--primary)/0.22),transparent_34%),radial-gradient(circle_at_78%_12%,hsl(var(--chart-2)/0.14),transparent_30%),linear-gradient(135deg,rgba(23,24,27,0.98),rgba(9,10,12,0.98))]" />
    <div class="pointer-events-none absolute inset-x-8 top-0 z-0 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
    <div class="relative z-10 mx-auto max-w-5xl">
      <section>
        <div class="border-b border-border/70 pb-4 dark:border-white/10">
          <h1 class="text-3xl font-bold tracking-tight text-foreground">
            {{ $t('account_page.title') }}
          </h1>
        </div>

        <form
          class="mx-auto mt-8 max-w-md space-y-6 pb-24"
          @submit.prevent="saveProfile"
        >
          <div class="space-y-4 text-center">
            <div class="mx-auto grid size-32 place-items-center rounded-full bg-gradient-to-br from-pink-500 via-fuchsia-600 to-primary text-8xl font-light leading-none text-white shadow-[0_18px_60px_-18px_rgba(219,39,119,0.9)] ring-4 ring-background/80 dark:ring-white/10">
              {{ initial }}
            </div>

            <div class="space-y-2">
              <h2 class="text-lg font-semibold text-foreground">
                {{ $t('account_page.heading') }}
              </h2>
              <p class="mx-auto max-w-sm text-sm leading-6 text-muted-foreground">
                {{ $t('account_page.description') }}
              </p>
            </div>
          </div>

          <div class="rounded-2xl border border-border/70 bg-background/70 p-4 shadow-sm dark:border-white/10 dark:bg-white/5">
            <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div class="flex items-start gap-3">
                <div class="grid size-10 shrink-0 place-items-center rounded-full bg-emerald-500/10 text-emerald-500">
                  <KeyRound class="size-5" />
                </div>
                <div class="space-y-1 text-left">
                  <h3 class="font-semibold text-foreground">
                    {{ $t('security_page.change_password') }}
                  </h3>
                  <p class="text-sm leading-6 text-muted-foreground">
                    {{ $t('security_page.change_password_desc') }}
                  </p>
                </div>
              </div>
              <Button
                type="button"
                variant="outline"
                class="h-10 shrink-0 border-border/80 bg-background/90 font-semibold dark:border-white/10 dark:bg-white/10"
                @click="openChangePasswordDialog"
              >
                {{ $t('security_page.change_password') }}
              </Button>
            </div>
          </div>

          <div class="space-y-2">
            <Label for="account-name" class="font-semibold text-foreground">{{ $t('account_page.full_name') }}</Label>
            <div class="relative">
              <UserRound class="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="account-name"
                v-model="form.name"
                class="h-12 border-border/80 bg-background/90 pl-10 text-foreground placeholder:text-muted-foreground focus-visible:ring-emerald-400 disabled:opacity-100 dark:border-white/10 dark:bg-white/10"
                :placeholder="$t('account_page.full_name')"
              />
            </div>
            <p v-if="nameError" class="text-xs text-destructive">
              {{ nameError }}
            </p>
          </div>

          <div class="space-y-2">
            <Label for="account-phone" class="font-semibold text-foreground">{{ $t('account_page.phone') }}</Label>
            <div class="grid grid-cols-[6.5rem_minmax(0,1fr)] gap-2">
              <Select v-model="form.countryCode">
                <SelectTrigger class="h-12 border-border/80 bg-background/90 text-foreground focus:ring-emerald-400 dark:border-white/10 dark:bg-white/10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="+84">+84</SelectItem>
                  <SelectItem value="+1">+1</SelectItem>
                  <SelectItem value="+81">+81</SelectItem>
                  <SelectItem value="+82">+82</SelectItem>
                </SelectContent>
              </Select>

              <div class="relative">
                <Phone class="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="account-phone"
                  v-model="form.phone"
                  class="h-12 border-border/80 bg-background/90 pl-10 pr-10 text-foreground placeholder:text-muted-foreground focus-visible:ring-emerald-400 dark:border-white/10 dark:bg-white/10"
                  inputmode="tel"
                  :placeholder="$t('account_page.phone')"
                />
                <button
                  v-if="form.phone"
                  type="button"
                  class="absolute right-2 top-1/2 flex size-8 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground transition hover:bg-muted hover:text-foreground"
                  :aria-label="$t('account_page.clear_phone')"
                  @click="form.phone = ''"
                >
                  <X class="size-5" />
                </button>
              </div>
            </div>
            <p v-if="phoneError" class="text-xs text-destructive">
              {{ phoneError }}
            </p>
          </div>

          <div class="space-y-2">
            <Label for="account-email" class="font-semibold text-foreground">{{ $t('account_page.email') }}</Label>
            <div class="relative">
              <Mail class="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="account-email"
                v-model="form.email"
                class="h-12 border-border/80 bg-background/90 pl-10 pr-10 text-foreground placeholder:text-muted-foreground focus-visible:ring-emerald-400 disabled:opacity-100 dark:border-white/10 dark:bg-white/10"
                type="email"
                :placeholder="$t('account_page.email')"
              />
              <CheckCircle2
                v-if="!emailError"
                class="absolute right-3 top-1/2 size-5 -translate-y-1/2 text-emerald-500"
              />
            </div>
            <p v-if="emailError" class="text-xs text-destructive">
              {{ emailError }}
            </p>
          </div>

          <div class="space-y-2">
            <Label for="account-birth-date" class="font-semibold text-foreground">{{ $t('account_page.birth_date') }}</Label>
            <div class="relative">
              <CalendarDays class="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="account-birth-date"
                v-model="form.birthDate"
                class="h-12 border-border/80 bg-background/90 pl-10 text-foreground focus-visible:ring-emerald-400 dark:border-white/10 dark:bg-white/10"
                type="date"
              />
            </div>
          </div>

          <fieldset class="space-y-3">
            <legend class="font-semibold text-foreground">{{ $t('account_page.gender') }}</legend>
            <div class="flex flex-wrap gap-6">
              <label class="inline-flex cursor-pointer items-center gap-2 text-sm font-medium text-foreground">
                <input v-model="form.gender" type="radio" :value="SavedAttendeeGender.Male" class="size-5 accent-emerald-500">
                {{ $t('account_page.gender_male') }}
              </label>
              <label class="inline-flex cursor-pointer items-center gap-2 text-sm font-medium text-foreground">
                <input v-model="form.gender" type="radio" :value="SavedAttendeeGender.Female" class="size-5 accent-emerald-500">
                {{ $t('account_page.gender_female') }}
              </label>
              <label class="inline-flex cursor-pointer items-center gap-2 text-sm font-medium text-foreground">
                <input v-model="form.gender" type="radio" :value="SavedAttendeeGender.PreferNotToSay" class="size-5 accent-emerald-500">
                {{ $t('account_page.gender_other') }}
              </label>
            </div>
          </fieldset>

          <Button
            type="submit"
            class="h-12 w-full bg-emerald-500 font-semibold text-white shadow-lg shadow-emerald-500/15 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground disabled:shadow-none"
            :is-loading="isSaving"
            :disabled="!canSubmit"
          >
            {{ $t('account_page.complete') }}
          </Button>
        </form>

        <ResponsiveDialog
          v-model:open="showChangePasswordDialog"
          content-class="sm:max-w-[425px]"
        >
          <DialogHeader>
            <DialogTitle>{{ $t('security_page.change_password') }}</DialogTitle>
            <DialogDescription>
              {{ $t('security_page.change_password_desc') }}
            </DialogDescription>
          </DialogHeader>
          <form
            class="space-y-4 py-4"
            @submit.prevent="onChangePassword"
          >
            <Alert
              v-if="generalPasswordError"
              variant="destructive"
            >
              <AlertDescription>{{ generalPasswordError }}</AlertDescription>
            </Alert>

            <VeeField
              v-slot="{ field, errors }"
              name="currentPassword"
            >
              <Field
                :data-invalid="!!errors.length"
                class="space-y-2"
              >
                <FieldLabel for="account-current-password">
                  {{ $t('security_page.current_password') }}
                </FieldLabel>
                <div class="relative">
                  <Input
                    id="account-current-password"
                    :model-value="field.value"
                    :type="showCurrentPassword ? 'text' : 'password'"
                    :placeholder="$t('security_page.current_password_placeholder')"
                    :disabled="savingPassword"
                    :aria-invalid="!!errors.length"
                    @update:model-value="field.onChange"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    class="absolute right-1 top-1 h-7 w-7 p-0"
                    @click="showCurrentPassword = !showCurrentPassword"
                  >
                    <Eye
                      v-if="!showCurrentPassword"
                      class="h-4 w-4"
                    />
                    <EyeOff
                      v-else
                      class="h-4 w-4"
                    />
                  </Button>
                </div>
                <FieldError
                  v-if="errors.length"
                  :errors="errors"
                />
              </Field>
            </VeeField>

            <VeeField
              v-slot="{ field, errors }"
              name="newPassword"
            >
              <Field
                :data-invalid="!!errors.length"
                class="space-y-2"
              >
                <FieldLabel for="account-new-password">
                  {{ $t('security_page.new_password') }}
                </FieldLabel>
                <div class="relative">
                  <Input
                    id="account-new-password"
                    :model-value="field.value"
                    :type="showNewPassword ? 'text' : 'password'"
                    :placeholder="$t('security_page.new_password_placeholder')"
                    :disabled="savingPassword"
                    :aria-invalid="!!errors.length"
                    @update:model-value="field.onChange"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    class="absolute right-1 top-1 h-7 w-7 p-0"
                    @click="showNewPassword = !showNewPassword"
                  >
                    <Eye
                      v-if="!showNewPassword"
                      class="h-4 w-4"
                    />
                    <EyeOff
                      v-else
                      class="h-4 w-4"
                    />
                  </Button>
                </div>
                <PasswordStrengthIndicator
                  v-if="passwordValues.newPassword"
                  :password="passwordValues.newPassword"
                  :strength="passwordStrength"
                />
                <FieldError
                  v-if="errors.length"
                  :errors="errors"
                />
              </Field>
            </VeeField>

            <VeeField
              v-slot="{ field, errors }"
              name="confirmPassword"
            >
              <Field
                :data-invalid="!!errors.length"
                class="space-y-2"
              >
                <FieldLabel for="account-confirm-password">
                  {{ $t('security_page.confirm_password') }}
                </FieldLabel>
                <div class="relative">
                  <Input
                    id="account-confirm-password"
                    :model-value="field.value"
                    :type="showConfirmPassword ? 'text' : 'password'"
                    :placeholder="$t('security_page.confirm_password_placeholder')"
                    :disabled="savingPassword"
                    :aria-invalid="!!errors.length"
                    @update:model-value="field.onChange"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    class="absolute right-1 top-1 h-7 w-7 p-0"
                    @click="showConfirmPassword = !showConfirmPassword"
                  >
                    <Eye
                      v-if="!showConfirmPassword"
                      class="h-4 w-4"
                    />
                    <EyeOff
                      v-else
                      class="h-4 w-4"
                    />
                  </Button>
                </div>
                <FieldError
                  v-if="errors.length"
                  :errors="errors"
                />
              </Field>
            </VeeField>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                :is-loading="savingPassword"
                @click="showChangePasswordDialog = false"
              >
                {{ $t('common.cancel') }}
              </Button>
              <Button
                type="submit"
                :disabled="!passwordMeta.valid"
                :is-loading="savingPassword"
              >
                {{ $t('security_page.change_password') }}
              </Button>
            </DialogFooter>
          </form>
        </ResponsiveDialog>
      </section>
    </div>
  </div>
</template>
