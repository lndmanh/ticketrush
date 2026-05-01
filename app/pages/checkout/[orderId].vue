<script setup lang="ts">
import { Field as VeeField, useForm } from 'vee-validate'
import { toast } from 'vue-sonner'
import { checkoutCustomerSchema } from '#shared/schemas/ticketingSchema'
import type { CheckoutCustomerInput } from '#shared/schemas/ticketingSchema'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field'

const route = useRoute()
const orderId = computed(() => route.params.orderId.toString())
const holdPublicId = computed(() => typeof route.query.hold === 'string' ? route.query.hold : '')
const isSubmitting = ref(false)
const currentTime = ref(Date.now())
let holdClockIntervalId: number | null = null
let checkoutRefreshIntervalId: number | null = null

const { data: checkoutResponse, refresh } = await useFetch(() => `/api/checkout/${orderId.value}`)
const checkout = computed(() => checkoutResponse.value?.data ?? null)

const checkoutSessionStartsAt = computed(() => checkout.value?.eventSession?.startsAt ?? null)

const holdTimeRemainingMs = computed(() => {
  const expiresAt = checkout.value?.hold?.expiresAt
  const status = checkout.value?.order?.status

  if (!expiresAt || status === 'confirmed') {
    return null
  }

  return Math.max(new Date(expiresAt).getTime() - currentTime.value, 0)
})

const holdCountdownLabel = computed(() => {
  if (holdTimeRemainingMs.value === null) {
    return null
  }

  const totalSeconds = Math.floor(holdTimeRemainingMs.value / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
})

const isHoldExpired = computed(() => holdTimeRemainingMs.value === 0)

const defaultValues: CheckoutCustomerInput = {
  customerName: '',
  customerEmail: '',
  customerPhone: '',
  customerAgeBracket: '25-34',
  customerGender: 'prefer-not-to-say',
}

const {
  handleSubmit,
  resetForm,
} = useForm({
  initialValues: { ...defaultValues },
  validationSchema: checkoutCustomerSchema,
})

watch(checkout, (value) => {
  if (!value?.order) {
    return
  }

  resetForm({
    values: {
      customerName: value.order.customerName ?? '',
      customerEmail: value.order.customerEmail ?? '',
      customerPhone: value.order.customerPhone ?? '',
      customerAgeBracket: value.order.customerAgeBracket ?? '25-34',
      customerGender: value.order.customerGender ?? 'prefer-not-to-say',
    },
  })
}, { immediate: true })

const onSubmit = handleSubmit(
  async (formValues) => {
    if (!checkout.value?.order || !holdPublicId.value || isHoldExpired.value) {
      toast.error('Your seat hold has expired. Please return to the event and choose seats again.')
      return
    }

    isSubmitting.value = true

    try {
      await $fetch('/api/checkout/confirm', {
        method: 'POST',
        body: {
          checkoutSessionId: checkout.value.order.checkoutSessionId,
          holdPublicId: holdPublicId.value,
          ...formValues,
        },
      })

      toast.success('Order confirmed')
      await refresh()
    }
    catch {
      toast.error('We could not confirm the order')
    }
    finally {
      isSubmitting.value = false
    }
  },
  ({ errors }) => {
    const firstError = Object.values(errors).flat().filter(Boolean)[0] || 'Please fix the highlighted fields'
    toast.error(firstError)
  },
)

onMounted(() => {
  holdClockIntervalId = window.setInterval(() => {
    currentTime.value = Date.now()
  }, 1000)

  checkoutRefreshIntervalId = window.setInterval(() => {
    void refresh()
  }, 10000)
})

onUnmounted(() => {
  if (holdClockIntervalId !== null) {
    window.clearInterval(holdClockIntervalId)
  }
  if (checkoutRefreshIntervalId !== null) {
    window.clearInterval(checkoutRefreshIntervalId)
  }
})

definePageMeta({
  title: 'Checkout',
  breadcrumb: 'Checkout',
  middleware: ['auth'],
})
</script>

<template>
  <main
    v-if="checkout"
    class="space-y-8 pb-16 pt-6 md:space-y-12 md:pb-24"
  >
    <section class="grid gap-6 xl:grid-cols-[1fr_0.92fr]">
      <div class="space-y-4">
        <span class="section-eyebrow">
          Secure checkout
        </span>
        <div class="space-y-3">
          <h1 class="display-title md:text-5xl">
            {{ checkout.order.status === 'confirmed' ? 'Order confirmed.' : 'Review your order.' }}
          </h1>
          <p class="max-w-[40rem] text-base leading-8 text-muted-foreground">
            This demo checkout does not connect to a live payment provider. Confirming the order finalizes your held seats and issues QR tickets immediately.
          </p>
        </div>
      </div>

      <div class="surface-shell">
        <div class="surface-core space-y-4">
          <div
            v-if="holdCountdownLabel && checkout.order.status !== 'confirmed'"
            :class="[
              'rounded-[1.5rem] px-5 py-4',
              isHoldExpired
                ? 'bg-rose-50 text-rose-950 dark:bg-rose-500/10 dark:text-rose-100'
                : 'bg-accent text-foreground',
            ]"
          >
            <p class="text-sm text-muted-foreground">
              Hold timer
            </p>
            <p class="mt-2 text-3xl font-semibold tracking-[-0.05em]">
              {{ holdCountdownLabel }}
            </p>
            <p class="mt-2 text-sm leading-7 text-muted-foreground">
              {{ isHoldExpired ? 'The hold expired. Return to the event and choose seats again.' : 'Seats remain reserved while this countdown is active.' }}
            </p>
          </div>

          <div
            v-for="item in checkout.items"
            :key="item.id"
            class="rounded-[1.5rem] border border-black/5 bg-white/70 px-4 py-4 dark:border-white/10 dark:bg-white/[0.03]"
          >
            <div class="flex items-center justify-between gap-3">
              <div>
                <p class="font-medium">
                  {{ item.ticketLabel }}
                </p>
                <p class="text-sm text-muted-foreground">
                  {{ item.sectionLabel }} · {{ item.rowLabel }} · {{ item.seatLabel }}
                </p>
              </div>
              <p class="font-mono text-sm">
                {{ Intl.NumberFormat('en-US').format(item.unitPriceCents / 100) }} VND
              </p>
            </div>
          </div>

          <div class="rounded-[1.75rem] bg-accent px-5 py-5">
            <p class="text-sm text-muted-foreground">
              Order total
            </p>
            <p class="mt-2 text-4xl font-semibold tracking-[-0.06em]">
              {{ Intl.NumberFormat('en-US').format(checkout.order.amountCents / 100) }} VND
            </p>
          </div>

          <div
            v-if="checkout.event"
            class="rounded-[1.5rem] border border-black/5 bg-white/70 px-4 py-4 text-sm text-muted-foreground dark:border-white/10 dark:bg-white/[0.03]"
          >
            <p class="font-medium text-foreground">
              {{ checkout.event.title }}
            </p>
            <p class="mt-1">
              {{ checkoutSessionStartsAt ? new Date(checkoutSessionStartsAt).toLocaleString() : 'Session time will be announced by the organizer.' }}
            </p>
          </div>
        </div>
      </div>
    </section>

    <section
      v-if="checkout.order.status !== 'confirmed'"
      class="surface-shell"
    >
      <form
        class="surface-core grid gap-6 lg:grid-cols-2"
        @submit.prevent="onSubmit"
      >
        <div class="space-y-3">
          <span class="section-eyebrow">
            Buyer details
          </span>
          <h2 class="text-3xl font-semibold tracking-[-0.05em]">
            Finish the order inside your hold window.
          </h2>
          <p class="text-sm leading-7 text-muted-foreground">
            We use this information for the digital ticket payload and dashboard demographics. You can keep optional fields minimal if you prefer.
          </p>
        </div>

        <div class="space-y-4">
          <FieldGroup>
            <VeeField
              v-slot="{ field, errors }"
              name="customerName"
            >
              <Field :data-invalid="!!errors.length">
                <FieldLabel for="checkout-customer-name">
                  Full name
                </FieldLabel>
                <Input
                  id="checkout-customer-name"
                  :model-value="field.value"
                  placeholder="Nguyen Minh Anh"
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
              name="customerEmail"
            >
              <Field :data-invalid="!!errors.length">
                <FieldLabel for="checkout-customer-email">
                  Email
                </FieldLabel>
                <Input
                  id="checkout-customer-email"
                  :model-value="field.value"
                  type="email"
                  placeholder="you@example.com"
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
              name="customerPhone"
            >
              <Field :data-invalid="!!errors.length">
                <FieldLabel for="checkout-customer-phone">
                  Phone
                </FieldLabel>
                <Input
                  id="checkout-customer-phone"
                  :model-value="field.value"
                  placeholder="+84 90 000 0000"
                  :aria-invalid="!!errors.length"
                  @update:model-value="field.onChange"
                />
                <FieldDescription>Optional. Useful for organizer outreach on schedule changes.</FieldDescription>
                <FieldError
                  v-if="errors.length"
                  :errors="errors"
                />
              </Field>
            </VeeField>

            <div class="grid gap-4 md:grid-cols-2">
              <VeeField
                v-slot="{ field, errors }"
                name="customerAgeBracket"
              >
                <Field :data-invalid="!!errors.length">
                  <FieldLabel for="checkout-age-bracket">
                    Age bracket
                  </FieldLabel>
                  <Select
                    :model-value="field.value"
                    @update:model-value="field.onChange"
                  >
                    <SelectTrigger id="checkout-age-bracket">
                      <SelectValue :placeholder="field.value ? undefined : 'Select age bracket'" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="18-24">
                        18–24
                      </SelectItem>
                      <SelectItem value="25-34">
                        25–34
                      </SelectItem>
                      <SelectItem value="35-44">
                        35–44
                      </SelectItem>
                      <SelectItem value="45+">
                        45+
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <FieldError
                    v-if="errors.length"
                    :errors="errors"
                  />
                </Field>
              </VeeField>

              <VeeField
                v-slot="{ field, errors }"
                name="customerGender"
              >
                <Field :data-invalid="!!errors.length">
                  <FieldLabel for="checkout-customer-gender">
                    Gender
                  </FieldLabel>
                  <Select
                    :model-value="field.value"
                    @update:model-value="field.onChange"
                  >
                    <SelectTrigger id="checkout-customer-gender">
                      <SelectValue :placeholder="field.value ? undefined : 'Select gender'" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="female">
                        Female
                      </SelectItem>
                      <SelectItem value="male">
                        Male
                      </SelectItem>
                      <SelectItem value="non-binary">
                        Non-binary
                      </SelectItem>
                      <SelectItem value="prefer-not-to-say">
                        Prefer not to say
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
          </FieldGroup>

          <Button
            type="submit"
            class="w-full rounded-full"
            size="lg"
            :is-loading="isSubmitting"
            :disabled="isHoldExpired"
          >
            Confirm order
          </Button>
        </div>
      </form>
    </section>

    <section
      v-else
      class="soft-grid lg:grid-cols-2"
    >
      <TicketQrCard
        v-for="ticket in checkout.tickets"
        :key="ticket.id"
        :payload="ticket.qrToken"
        :title="ticket.publicId"
        :subtitle="ticket.attendeeEmail"
      />

      <div class="surface-shell lg:col-span-2">
        <div class="surface-core flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <span class="section-eyebrow">
              Ticket wallet
            </span>
            <p class="mt-3 text-sm text-muted-foreground">
              Your issued tickets are now available in your account wallet.
            </p>
          </div>

          <Button
            as-child
            class="rounded-full"
          >
            <NuxtLink to="/tickets">
              Open my tickets
            </NuxtLink>
          </Button>
        </div>
      </div>
    </section>
  </main>
</template>
