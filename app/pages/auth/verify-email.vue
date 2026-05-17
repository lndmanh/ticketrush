<script setup lang="ts">
import { MailCheck } from '@lucide/vue'
import { parseApiError } from '@/utils/apiError'

const route = useRoute()
const requestUrl = useRequestURL()
const email = computed(() => {
  const val = route.query.email
  return typeof val === 'string' ? val : ''
})

function safeRedirectPath(value: string, baseUrl: string) {
  try {
    const parsed = new URL(value, baseUrl)
    if (parsed.origin !== baseUrl) {
      return ''
    }

    return `${parsed.pathname}${parsed.search}${parsed.hash}`
  }
  catch {
    return ''
  }
}

const loginLink = computed(() => {
  const redirectTo = typeof route.query.redirectTo === 'string' ? route.query.redirectTo : ''
  const safeRedirectTo = redirectTo ? safeRedirectPath(redirectTo, requestUrl.origin) : ''

  return safeRedirectTo ? `/auth/login?redirectTo=${encodeURIComponent(safeRedirectTo)}` : '/auth/login'
})

const isResending = ref(false)
const resendSuccess = ref(false)
const resendError = ref('')
const { t } = useI18n()

definePageMeta({
  title: 'auth.verify_email_title',
  breadcrumb: 'auth.verify_email_breadcrumb',
  layout: 'empty',
})

useSeo({
  title: computed(() => t('auth.verify_email_title')),
  description: computed(() => t('auth.verify_email_description')),
  type: 'website',
})

async function resendVerification() {
  if (!email.value || isResending.value) return

  isResending.value = true
  resendSuccess.value = false
  resendError.value = ''

  try {
    const response = await apiRequest('/api/auth/resend-verification', {
      method: 'POST',
      body: { email: email.value },
    })
    if (!response.success) {
      throw response
    }
    resendSuccess.value = true
  }
  catch (err: unknown) {
    resendError.value = parseApiError(err, 'Failed to resend verification email. Please try again.').message
  }
  finally {
    isResending.value = false
  }
}
</script>

<template>
  <AuthPageLayout quote="Verify your account once, then keep your reading in sync everywhere.">
    <div class="space-y-6 text-center">
      <div class="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
        <MailCheck
          aria-hidden="true"
          class="h-7 w-7 text-primary"
        />
      </div>

      <div class="space-y-2">
        <h1 class="text-2xl font-semibold tracking-tight">
          Check your email
        </h1>
        <p class="text-sm text-muted-foreground">
          We've sent a verification link to
          <strong
            v-if="email"
            class="text-foreground"
          >{{ email }}</strong>
          <span v-else>your email address</span>
        </p>
      </div>

      <p class="text-sm text-muted-foreground">
        Click the link in the email to verify your account. If you don't see it, check your spam folder.
      </p>

      <Alert
        v-if="resendSuccess"
        class="border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950"
      >
        <AlertDescription class="text-green-700 dark:text-green-300">
          Verification email sent! Please check your inbox.
        </AlertDescription>
      </Alert>

      <Alert
        v-if="resendError"
        variant="destructive"
      >
        <AlertDescription>{{ resendError }}</AlertDescription>
      </Alert>

      <div class="space-y-3 pt-2">
        <Button
          variant="outline"
          class="w-full"
          :disabled="!email || isResending || resendSuccess"
          :is-loading="isResending"
          @click="resendVerification"
        >
          {{ resendSuccess ? 'Email Sent' : 'Resend Verification Email' }}
        </Button>

        <div>
          <NuxtLink
            :to="loginLink"
            class="text-sm font-medium text-primary hover:underline"
          >
            Back to Sign In
          </NuxtLink>
        </div>
      </div>
    </div>
  </AuthPageLayout>
</template>
