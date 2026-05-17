<script setup lang="ts">
import { CheckCircle2, Loader2, ShieldCheck, ShieldAlert } from '@lucide/vue'
import { apiRoutes } from '#shared/apiRoutes'
import { parseApiError } from '@/utils/apiError'
import { apiRequest } from '@/utils/apiRequest'
import { clearEventSessionAccessData } from '@/utils/eventSessionAccessData'
import type { ApiResponse } from '~~/types/api'
import type { PublicEventSessionSummary } from '~~/types/events'
import type { BookingCaptchaPassResponse } from '~~/types/ticketing'

type CaptchaState = 'ready' | 'verifying' | 'success' | 'error'

const props = defineProps<{
  open: boolean
  session: PublicEventSessionSummary | null
  eventSlug: string
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
}>()

const { t } = useI18n()

const state = ref<CaptchaState>('ready')
const turnstileToken = ref('')
const errorMessage = ref('')
const turnstileRenderKey = ref(0)

const isVerifying = computed(() => state.value === 'verifying')
const isSuccess = computed(() => state.value === 'success')
const canShowTurnstile = computed(() => state.value === 'ready' || state.value === 'verifying')
const sessionLabel = computed(() => props.session?.label ?? t('common.sessions'))

watch(() => props.open, (open) => {
  if (open) {
    resetCaptcha()
  }
})

watch(turnstileToken, (token) => {
  if (!token || state.value === 'verifying' || state.value === 'success') {
    return
  }

  void verifyCaptcha(token)
})

function handleOpenChange(value: boolean) {
  if (value) {
    emit('update:open', true)
  }
}

function preventDialogClose(event: Event) {
  event.preventDefault()
}

function retryCaptcha() {
  resetCaptcha()
}

function resetCaptcha() {
  state.value = 'ready'
  turnstileToken.value = ''
  errorMessage.value = ''
  turnstileRenderKey.value += 1
}

async function verifyCaptcha(token: string) {
  if (!props.session) {
    state.value = 'error'
    errorMessage.value = t('booking_captcha.error_retry')
    turnstileToken.value = ''
    turnstileRenderKey.value += 1
    return
  }

  state.value = 'verifying'
  errorMessage.value = ''

  try {
    const sessionPublicId = props.session.publicId
    const response = await apiRequest<ApiResponse<BookingCaptchaPassResponse>>(apiRoutes.eventSessionCaptchaPass(sessionPublicId), {
      method: 'POST',
      body: { 'cf-turnstile-response': token },
    })

    if (!response.success) {
      throw response
    }

    state.value = 'success'
    clearEventSessionAccessData(sessionPublicId, clearNuxtData)
    await navigateTo(`/events/${props.eventSlug}/sessions/${sessionPublicId}/seats`)
  }
  catch (error: unknown) {
    const parsedError = parseApiError(error, t('booking_captcha.error_retry'))
    state.value = 'error'
    errorMessage.value = parsedError.message
    turnstileToken.value = ''
    turnstileRenderKey.value += 1
  }
}
</script>

<template>
  <Dialog
    :open="open"
    @update:open="handleOpenChange"
  >
    <DialogContent
      hide-close
      class="p-4 sm:max-w-md sm:p-6"
      @escape-key-down="preventDialogClose"
      @pointer-down-outside="preventDialogClose"
      @interact-outside="preventDialogClose"
    >
      <DialogHeader>
        <DialogTitle class="flex items-center gap-2">
          <ShieldCheck
            data-icon
            aria-hidden="true"
            class="size-5 text-primary"
          />
          {{ $t('booking_captcha.title') }}
        </DialogTitle>
        <DialogDescription>
          {{ $t('booking_captcha.description', { session: sessionLabel }) }}
        </DialogDescription>
      </DialogHeader>

      <div class="space-y-4">
        <Alert
          v-if="state === 'error'"
          variant="destructive"
        >
          <ShieldAlert
            aria-hidden="true"
            class="size-4"
          />
          <AlertTitle>{{ $t('booking_captcha.error_title') }}</AlertTitle>
          <AlertDescription>{{ errorMessage }}</AlertDescription>
        </Alert>

        <Alert
          v-if="isSuccess"
          variant="success"
        >
          <CheckCircle2
            aria-hidden="true"
            class="size-4"
          />
          <AlertTitle>{{ $t('booking_captcha.success') }}</AlertTitle>
        </Alert>

        <div
          v-if="canShowTurnstile"
          class="flex min-h-20 items-center justify-center overflow-x-auto rounded-lg border border-dashed bg-background p-2 transition-opacity sm:p-4"
          :class="isVerifying ? 'pointer-events-none opacity-60' : ''"
        >
          <NuxtTurnstile
            :key="turnstileRenderKey"
            v-model="turnstileToken"
          />
        </div>

        <p
          v-if="isVerifying"
          class="flex items-center justify-center gap-2 text-center text-sm text-muted-foreground"
        >
          <Loader2
            aria-hidden="true"
            class="size-4 animate-spin"
          />
          {{ $t('booking_captcha.verifying') }}
        </p>
      </div>

      <DialogFooter v-if="state === 'error'">
        <Button
          type="button"
          class="w-full sm:w-auto"
          @click="retryCaptcha"
        >
          {{ $t('errors.try_again') }}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
