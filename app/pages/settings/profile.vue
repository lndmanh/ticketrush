<script setup lang="ts">
import { AlertTriangle } from '@lucide/vue'
import { toast } from 'vue-sonner'
import { Field as VeeField, useForm } from 'vee-validate'
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

const { t } = useI18n()

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
    toast.error(parseApiError(error, t('account_page.delete_error')).message)
  }
}

const profile = computed(() => profileResponse.value?.success ? profileResponse.value.data : null)
const isSaving = ref(false)

const defaultProfileValues: UpdateProfileInput = {
  name: '',
  email: '',
}

const {
  handleSubmit: handleProfileSubmit,
  resetForm: resetProfileForm,
  setFieldError: setProfileFieldError,
  meta: profileMeta,
} = useForm<UpdateProfileInput>({
  initialValues: { ...defaultProfileValues },
  validationSchema: updateProfileSchema,
})

function createProfileFormValues(value: UserProfileModel): UpdateProfileInput {
  return {
    name: value.name || '',
    email: value.email || '',
  }
}

function syncProfileToForm(value: UserProfileModel | null) {
  if (!value) {
    return
  }

  resetProfileForm({ values: createProfileFormValues(value) })
}

watch(profile, syncProfileToForm, { immediate: true })

function getProfilePayload(formValues: UpdateProfileInput): UpdateProfileInput {
  return {
    name: formValues.name.trim(),
    email: formValues.email.trim(),
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
                <FieldDescription>
                  {{ $t('account_page.booking_details_managed_from') }}
                  <NuxtLink to="/attendees">
                    {{ $t('saved_attendees.title') }}
                  </NuxtLink>.
                </FieldDescription>
                <FieldError
                  v-if="errors.length"
                  :errors="errors"
                />
              </Field>
            </VeeField>

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
            <CardTitle>{{ $t('account_page.delete_title') }}</CardTitle>
          </div>
          <CardDescription>
            {{ $t('account_page.delete_description') }}
          </CardDescription>
        </div>
        <Button
          variant="destructive"
          class="shadow-lg shadow-destructive/20"
          @click="confirmDeleteAccount"
        >
          {{ $t('account_page.delete_action') }}
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
          <AlertDialogTitle>{{ $t('account_page.delete_dialog_title') }}</AlertDialogTitle>
          <AlertDialogDescription>
            {{ $t('account_page.delete_dialog_description') }}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel @click="showDeleteAccountDialog = false">
            {{ $t('common.cancel') }}
          </AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            @click="deleteAccount"
          >
            {{ $t('account_page.delete_action') }}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </div>
</template>
