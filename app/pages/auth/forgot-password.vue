<script setup lang="ts">
import { KeyRound, Mail } from '@lucide/vue'
import { Field as VeeField, useForm } from 'vee-validate'
import { z } from 'zod'
import { apiRequest } from '@/utils/apiRequest'
import { parseApiError } from '@/utils/apiError'

const formSchema = z.object({
  email: z.email({ error: 'Please enter a valid email address' }),
})

const turnstileToken = ref('')
const isSubmitting = ref(false)
const isSubmitted = ref(false)
const error = ref('')

const { handleSubmit } = useForm({
  initialValues: { email: '' },
  validationSchema: formSchema,
})

const onSubmit = handleSubmit(async (values) => {
  isSubmitting.value = true
  error.value = ''

  try {
    const response = await apiRequest('/api/auth/forgot-password', {
      method: 'POST',
      body: {
        'email': values.email,
        'cf-turnstile-response': turnstileToken.value,
      },
    })
    if (!response.success) {
      throw response
    }
    isSubmitted.value = true
  }
  catch (err: unknown) {
    error.value = parseApiError(err, 'Something went wrong. Please try again.').message
  }
  finally {
    isSubmitting.value = false
  }
})

definePageMeta({
  layout: 'empty',
  title: 'auth.forgot_password_title',
  breadcrumb: 'auth.forgot_password_title',
})
</script>

<template>
  <AuthPageLayout :quote="$t('auth.forgot_password_quote')">
    <div class="space-y-3">
      <div class="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
        <KeyRound
          aria-hidden="true"
          class="h-6 w-6 text-primary"
        />
      </div>
      <div class="space-y-1">
        <h1 class="text-2xl font-bold tracking-tight">
          {{ $t('auth.forgot_password_title') }}
        </h1>
        <p class="text-base text-muted-foreground">
          {{ isSubmitted ? $t('auth.forgot_password_check_email') : $t('auth.forgot_password_desc') }}
        </p>
      </div>
    </div>

    <Alert
      v-if="error"
      variant="destructive"
    >
      <AlertDescription>{{ error }}</AlertDescription>
    </Alert>

    <div
      v-if="isSubmitted"
      aria-live="polite"
      class="space-y-4"
    >
      <p class="text-sm text-muted-foreground">
        {{ $t('auth.forgot_password_sent_desc') }}
      </p>
      <p class="text-sm text-muted-foreground">
        {{ $t('auth.forgot_password_expiry') }}
      </p>
      <Button
        type="button"
        variant="outline"
        class="w-full active:scale-[0.98]"
        @click="navigateTo('/auth/login')"
      >
        {{ $t('auth.back_to_sign_in') }}
      </Button>
    </div>

    <form
      v-else
      class="space-y-4"
      @submit.prevent="onSubmit"
    >
      <VeeField
        v-slot="{ field, errors }"
        name="email"
      >
        <Field
          :data-invalid="!!errors.length"
          class="space-y-2"
        >
          <FieldLabel
            for="forgot-email"
            class="text-sm font-medium"
          >
            {{ $t('auth.email_label') }}
          </FieldLabel>
          <div class="relative">
            <Mail
              aria-hidden="true"
              class="absolute left-3 top-3 h-4 w-4 text-muted-foreground"
            />
            <Input
              id="forgot-email"
              name="email"
              :model-value="field.value"
              type="email"
              autocomplete="email"
              :placeholder="$t('auth.email_placeholder')"
              class="h-11 pl-9"
              :disabled="isSubmitting"
              :aria-invalid="!!errors.length"
              @update:model-value="field.onChange"
            />
          </div>
          <FieldError
            v-if="errors.length"
            :errors="errors"
          />
        </Field>
      </VeeField>

      <NuxtTurnstile v-model="turnstileToken" />

      <Button
        type="submit"
        class="h-11 w-full active:scale-[0.98]"
        :is-loading="isSubmitting"
        :disabled="!turnstileToken"
      >
        {{ $t('auth.send_reset_link') }}
      </Button>

      <div class="text-center">
        <NuxtLink
          to="/auth/login"
          class="text-sm font-medium text-primary hover:underline"
        >
            {{ $t('auth.back_to_sign_in') }}
        </NuxtLink>
      </div>
    </form>
  </AuthPageLayout>
</template>
