<script setup lang="ts">
import { AlertTriangle, ArrowRight, Loader2, X } from '@lucide/vue'
import { apiRoutes } from '#shared/apiRoutes'
import { apiRequest } from '@/utils/apiRequest'
import { parseApiError } from '@/utils/apiError'
import type { ApiResponse } from '~~/types/api'
import type { CheckoutDetailData } from '~~/types/ticketing'

const { data: activeCheckoutResponse, refresh: refreshActiveCheckout } = await useAPI<ApiResponse<CheckoutDetailData | null>>(() => apiRoutes.CHECKOUT_ACTIVE)

const checkout = computed<CheckoutDetailData | null>(() => {
  const response = activeCheckoutResponse.value

  if (response && response.success) {
    return response.data
  }

  return null
})

const isCancelling = ref(false)
const cancelError = ref('')

const eventTitle = computed(() => checkout.value?.event?.title?.trim() || 'your selected event')
const checkoutPath = computed(() => checkout.value ? `/checkout/${checkout.value.order.publicId}` : '/checkout')

async function cancelCheckout() {
  if (!checkout.value || isCancelling.value) {
    return
  }

  isCancelling.value = true
  cancelError.value = ''

  try {
    const response = await apiRequest<ApiResponse<unknown>>(apiRoutes.checkout(checkout.value.order.publicId), {
      method: 'DELETE',
    })

    if (!response.success) {
      throw response
    }
  }
  catch (error) {
    cancelError.value = parseApiError(error, 'Failed to cancel checkout. Please try again.').message
    isCancelling.value = false
    return
  }

  try {
    await refreshActiveCheckout()
  }
  catch {
    cancelError.value = 'Checkout cancelled. Refresh the page if this banner remains.'
  }
  finally {
    isCancelling.value = false
  }
}
</script>

<template>
  <AlertBox
    v-if="checkout"
    variant="warning"
  >
    <AlertTriangle class="mt-0.5 size-5 shrink-0 text-yellow-600 dark:text-yellow-300" />

    <AlertBoxContent class="gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div class="min-w-0 space-y-1">
        <h2 class="font-medium leading-snug tracking-tight">
          You have an unfinished checkout.
        </h2>
        <p class="text-sm leading-relaxed text-muted-foreground">
          Continue checkout for {{ eventTitle }}, or cancel it before choosing another ticket.
        </p>
        <p
          v-if="cancelError"
          class="text-sm font-medium text-destructive"
          role="alert"
        >
          {{ cancelError }}
        </p>
      </div>

      <AlertBoxActions class="flex-col items-stretch sm:flex-row sm:items-center sm:justify-end">
        <Button
          as-child
          size="sm"
        >
          <NuxtLink :to="checkoutPath">
            Continue
            <ArrowRight class="size-4" />
          </NuxtLink>
        </Button>

        <Button
          type="button"
          variant="outline"
          size="sm"
          :is-loading="isCancelling"
          @click="cancelCheckout"
        >
          <X
            class="size-4"
          />
          Cancel
        </Button>
      </AlertBoxActions>
    </AlertBoxContent>
  </AlertBox>
</template>
