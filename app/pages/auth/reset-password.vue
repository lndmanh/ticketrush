<script setup lang="ts">
import AuthPageLayout from '@/components/auth/AuthPageLayout.vue'
import { Lock, Eye, EyeOff, KeyRound } from '@lucide/vue'
import { Field as VeeField, useForm } from 'vee-validate'
import { passwordComplexitySchema } from '#shared/schemas/userSchema'
import { calculatePasswordStrength } from '@/utils/passwordValidation'
import PasswordStrengthIndicator from '@/components/PasswordStrengthIndicator.vue'
import { z } from 'zod'
import { apiRoutes } from '#shared/apiRoutes'
import { parseApiError } from '@/utils/apiError'

const route = useRoute()
const token = computed(() => {
  const val = route.query.token
  return typeof val === 'string' ? val : ''
})

const formSchema = z.object({
  password: passwordComplexitySchema,
  confirmPassword: z.string().min(1, 'Please confirm your password'),
}).refine(data => data.password === data.confirmPassword, {
  error: 'Passwords do not match',
  path: ['confirmPassword'],
})

const showPassword = ref(false)
const showConfirmPassword = ref(false)
const isSubmitting = ref(false)
const error = ref('')
const success = ref(false)
const { t } = useI18n()

const { handleSubmit, values, meta } = useForm({
  initialValues: { password: '', confirmPassword: '' },
  validationSchema: formSchema,
})

const passwordStrength = computed(() => calculatePasswordStrength(values.password || ''))
const isFormValid = computed(() => meta.value.valid && passwordStrength.value.score >= 80)

const onSubmit = handleSubmit(async (formValues) => {
  if (!token.value) {
    error.value = 'Invalid reset link. Please request a new one.'
    return
  }

  isSubmitting.value = true
  error.value = ''
  success.value = false

  try {
    const response = await apiRequest(apiRoutes.AUTH_RESET_PASSWORD, {
      method: 'POST',
      body: {
        token: token.value,
        password: formValues.password,
        confirmPassword: formValues.confirmPassword,
      },
    })

    if (!response.success) {
      throw response
    }

    success.value = true
  }
  catch (err: unknown) {
    error.value = parseApiError(err, 'Something went wrong. Please try again.').message
    isSubmitting.value = false
  }
})

definePageMeta({
  title: 'auth.reset_password_title',
  breadcrumb: 'auth.reset_password_breadcrumb',
  layout: 'empty',
})

useSeo({
  title: computed(() => t('auth.reset_password_title')),
  description: computed(() => t('auth.reset_password_description')),
  type: 'website',
})
</script>

<template>
  <AuthPageLayout quote="Choose a fresh key and step right back into your library.">
    <div class="space-y-5">
      <div class="space-y-3 text-center">
        <div class="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
          <KeyRound
            aria-hidden="true"
            class="h-6 w-6 text-primary"
          />
        </div>
        <div class="space-y-1">
          <h1 class="text-2xl font-bold tracking-tight">
            Set a new password
          </h1>
          <p class="text-base text-muted-foreground">
            Enter your new password below.
          </p>
        </div>
      </div>

      <Alert
        v-if="error"
        variant="destructive"
      >
        <AlertDescription>{{ error }}</AlertDescription>
      </Alert>

      <Alert
        v-if="success"
      >
        <AlertDescription>
          Password reset successfully. You can now sign in with your new password.
        </AlertDescription>
      </Alert>

      <Alert
        v-if="!token"
        variant="destructive"
      >
        <AlertDescription>
          Invalid reset link. Please
          <NuxtLink
            :to="{ path: '/auth/forgot-password' }"
            class="underline font-medium"
          >
            request a new one
          </NuxtLink>.
        </AlertDescription>
      </Alert>

      <form
        v-if="token && !success"
        class="space-y-4"
        @submit.prevent="onSubmit"
      >
        <VeeField
          v-slot="{ field, errors }"
          name="password"
        >
          <Field
            :data-invalid="!!errors.length"
            class="space-y-2"
          >
            <FieldLabel
              for="new-password"
              class="text-sm font-medium"
            >
              New Password
            </FieldLabel>
            <div class="relative">
              <Lock
                aria-hidden="true"
                class="absolute left-3 top-3 h-4 w-4"
              />
              <Input
                id="new-password"
                :model-value="field.value"
                :type="showPassword ? 'text' : 'password'"
                placeholder="Enter new password"
                class="h-11 pl-9 pr-9"
                :disabled="isSubmitting"
                :aria-invalid="!!errors.length"
                autocomplete="new-password"
                @update:model-value="field.onChange"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                class="absolute right-1 top-1 h-9 w-9 p-0 hover:bg-transparent"
                :aria-label="showPassword ? 'Hide password' : 'Show password'"
                :aria-pressed="showPassword"
                @click="showPassword = !showPassword"
              >
                <Eye
                  v-if="!showPassword"
                  aria-hidden="true"
                  class="h-4 w-4"
                />
                <EyeOff
                  v-else
                  aria-hidden="true"
                  class="h-4 w-4"
                />
              </Button>
            </div>
            <FieldError
              v-if="errors.length"
              :errors="errors"
            />
            <PasswordStrengthIndicator
              :password="values.password || ''"
              :strength="passwordStrength"
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
            <FieldLabel
              for="confirm-new-password"
              class="text-sm font-medium"
            >
              Confirm New Password
            </FieldLabel>
            <div class="relative">
              <Lock
                aria-hidden="true"
                class="absolute left-3 top-3 h-4 w-4"
              />
              <Input
                id="confirm-new-password"
                :model-value="field.value"
                :type="showConfirmPassword ? 'text' : 'password'"
                placeholder="Confirm new password"
                class="h-11 pl-9 pr-9"
                :disabled="isSubmitting"
                :aria-invalid="!!errors.length"
                autocomplete="new-password"
                @update:model-value="field.onChange"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                class="absolute right-1 top-1 h-9 w-9 p-0 hover:bg-transparent"
                :aria-label="showConfirmPassword ? 'Hide password confirmation' : 'Show password confirmation'"
                :aria-pressed="showConfirmPassword"
                @click="showConfirmPassword = !showConfirmPassword"
              >
                <Eye
                  v-if="!showConfirmPassword"
                  aria-hidden="true"
                  class="h-4 w-4"
                />
                <EyeOff
                  v-else
                  aria-hidden="true"
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

        <Button
          type="submit"
          class="h-11 w-full"
          :disabled="!isFormValid"
          :is-loading="isSubmitting"
        >
          Reset Password
        </Button>

        <p
          v-if="values.password && passwordStrength.score < 80"
          class="text-center text-xs"
        >
          Password must be strong to reset
        </p>
      </form>

      <div class="text-center">
        <NuxtLink
          to="/auth/login"
          class="text-sm font-medium text-primary hover:underline"
        >
          Back to Sign In
        </NuxtLink>
      </div>
    </div>
  </AuthPageLayout>
</template>
