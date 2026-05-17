<script setup lang="ts">
import { CalendarClock, Check, CreditCard, TicketCheck } from '@lucide/vue'
import { Motion } from 'motion-v'
import type { ApiResponse } from '~~/types/api'
import type { CheckoutDetailData } from '~~/types/ticketing'
import { OrderPaymentMethod } from '#shared/commonEnums'
import { getDisplayDateLocale } from '@/lib/localizedEvents'
import { getCheckoutEventPath, getCheckoutRoutePath, getCheckoutSuccessRouteState, getCheckoutTicketCount } from '@/utils/checkoutSuccess'
import confetti from 'canvas-confetti'

const route = useRoute()
const { locale, t } = useI18n()
const { formatCurrency: formatPreferredCurrency } = useCurrencyPreference()
const orderId = computed(() => route.params.orderId.toString())
const hasCelebrated = ref(false)

const { data: checkoutResponse } = await useAPI<ApiResponse<CheckoutDetailData>>(() => `/api/checkout/${orderId.value}`, {
  query: computed(() => ({ locale: locale.value })),
})
const checkout = computed(() => checkoutResponse.value?.success ? checkoutResponse.value.data : null)
const routeState = computed(() => getCheckoutSuccessRouteState(checkout.value?.order.status))

if (checkout.value && routeState.value === 'checkout') {
  await navigateTo(getCheckoutRoutePath(orderId.value), { replace: true })
}

function formatOrderCurrency(cents: number) {
  return formatPreferredCurrency(cents, checkout.value?.order.currency ?? 'VND', getDisplayDateLocale(locale.value))
}

function formatDateTime(value: string | Date) {
  return new Date(value).toLocaleString(getDisplayDateLocale(locale.value))
}

function getPaymentMethodLabel(payment: OrderPaymentMethod | null | undefined) {
  if (payment === OrderPaymentMethod.Visa) return t('checkout.payment_visa')
  if (payment === OrderPaymentMethod.Mastercard) return t('checkout.payment_mastercard')
  if (payment === OrderPaymentMethod.Paypal) return t('checkout.payment_paypal')
  if (payment === OrderPaymentMethod.Bank) return t('checkout.payment_bank')
  return t('tickets.detail_unknown')
}

const confirmedAtLabel = computed(() => {
  const confirmedAt = checkout.value?.order.confirmedAt ?? checkout.value?.order.updatedAt ?? null
  return confirmedAt ? formatDateTime(confirmedAt) : t('tickets.detail_unknown')
})

const isConfirmed = computed(() => checkout.value !== null && routeState.value === 'confirmed')
const ticketCount = computed(() => getCheckoutTicketCount(checkout.value?.tickets.length ?? 0, checkout.value?.items.length ?? 0))
const eventPath = computed(() => getCheckoutEventPath(checkout.value?.event?.slug))
const eventTimeLabel = computed(() => checkout.value?.eventSession?.startsAt ? formatDateTime(checkout.value.eventSession.startsAt) : t('checkout.session_time_tba'))
const pageTitle = computed(() => isConfirmed.value ? t('checkout.success_title') : t('checkout.success_cancelled_title'))
const pageDescription = computed(() => isConfirmed.value ? t('checkout.success_desc') : t('checkout.success_cancelled_desc'))
const seoTitle = computed(() => checkout.value?.event?.title ? `${checkout.value.event.title} · ${pageTitle.value}` : pageTitle.value)
const pageBadge = computed(() => isConfirmed.value ? t('checkout.success_eyebrow') : t('checkout.success_cancelled_badge'))

useSeo({
  title: seoTitle,
  description: pageDescription,
  type: 'website',
})

usePageBreadcrumbs(computed(() => {
  if (!checkout.value || checkout.value.order.publicId !== orderId.value) {
    return undefined
  }

  const items = [
    { title: t('home.breadcrumb'), href: '/' },
  ]

  if (checkout.value.event?.slug && checkout.value.event.title) {
    items.push(
      { title: t('events.breadcrumb'), href: '/events' },
      { title: checkout.value.event.title, href: getCheckoutEventPath(checkout.value.event.slug) },
    )
  }

  items.push({ title: t('checkout.success_breadcrumb'), href: route.path })
  return items
}))

function fireConfetti() {
  if (hasCelebrated.value || !isConfirmed.value || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    return
  }

  hasCelebrated.value = true
  confetti({
    particleCount: 72,
    spread: 58,
    startVelocity: 34,
    scalar: 0.85,
    origin: { y: 0.62 },
  })
}

onMounted(() => {
  void fireConfetti()
})

definePageMeta({
  title: 'checkout.success_page_title',
  breadcrumb: 'checkout.success_breadcrumb',
  layout: 'default',
  middleware: ['auth'],
})
</script>

<template>
  <main
    aria-live="polite"
    class="relative flex min-h-[100dvh] items-center justify-center overflow-hidden bg-background px-4 py-10 text-foreground sm:px-6 lg:px-8"
  >
    <Card class="overflow-hidden rounded-[2rem] border-border/70 bg-card py-0 shadow-2xl shadow-primary/5">
      <CardHeader class="flex flex-col gap-6 p-6 text-center pb-0">
        <div
          class="mx-auto flex size-12 items-center justify-center rounded-2xl"
          :class="isConfirmed ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'"
        >
          <Check
            v-if="isConfirmed"
            class="size-5"
            aria-hidden="true"
          />
          <TicketCheck
            v-else
            class="size-5"
            aria-hidden="true"
          />
        </div>

        <div class="w-full flex flex-col gap-2">
          <Badge
            variant="secondary"
            class="mx-auto w-fit rounded-full px-3 py-1"
          >
            {{ pageBadge }}
          </Badge>
          <CardTitle class="text-balance text-3xl font-semibold leading-none tracking-[-0.05em] sm:text-4xl">
            {{ pageTitle }}
          </CardTitle>
          <p class="mx-auto max-w-sm text-sm leading-6 text-muted-foreground">
            {{ pageDescription }}
          </p>
        </div>
      </CardHeader>

      <CardContent
        v-if="isConfirmed && checkout"
        class="flex flex-col gap-5 px-6 pb-6 sm:px-8 sm:pb-8"
      >
        <section
          class="flex flex-col gap-4"
          :aria-label="$t('checkout.success_billing_summary')"
        >
          <div class="rounded-2xl bg-muted/50 p-5 text-center">
            <p class="text-sm font-medium text-muted-foreground">
              {{ $t('checkout.order_total') }}
            </p>
            <p class="mt-2 text-5xl font-semibold leading-none tracking-[-0.08em] tabular-nums sm:text-6xl">
              {{ formatOrderCurrency(checkout.order.amountCents) }}
            </p>
          </div>

          <div class="grid gap-3 sm:grid-cols-2">
            <div class="rounded-2xl bg-muted/45 p-4">
              <p class="text-sm text-muted-foreground">
                {{ $t('checkout.payment_method') }}
              </p>
              <p class="mt-2 font-semibold">
                {{ getPaymentMethodLabel(checkout.order.payment) }}
              </p>
            </div>
            <div class="rounded-2xl bg-muted/45 p-4">
              <p class="text-sm text-muted-foreground">
                {{ $t('checkout.success_ticket_count') }}
              </p>
              <p class="mt-2 font-semibold tabular-nums">
                {{ ticketCount }}
              </p>
            </div>
          </div>

          <Separator />

          <div class="flex flex-col gap-3 text-sm">
            <div class="flex items-start gap-3">
              <CalendarClock
                class="mt-0.5 size-4 text-muted-foreground"
                aria-hidden="true"
              />
              <div class="min-w-0">
                <p class="font-medium">
                  {{ checkout.event?.title ?? $t('checkout.page_title') }}
                </p>
                <p class="text-muted-foreground">
                  {{ checkout.eventSession?.label ?? $t('tickets.session_label') }} · {{ eventTimeLabel }}
                </p>
              </div>
            </div>
            <div class="flex items-start gap-3">
              <CreditCard
                class="mt-0.5 size-4 text-muted-foreground"
                aria-hidden="true"
              />
              <div>
                <p class="font-medium">
                  {{ $t('checkout.success_confirmed_at') }}
                </p>
                <p class="text-muted-foreground">
                  {{ confirmedAtLabel }}
                </p>
              </div>
            </div>
          </div>
        </section>
      </CardContent>

      <CardFooter class="flex flex-col gap-3 border-t p-6 sm:flex-row sm:items-center sm:justify-between">
        <Button
          v-if="isConfirmed"
          as-child
          class="w-full rounded-full active:scale-[0.98] sm:w-auto"
        >
          <NuxtLink to="/tickets">
            <TicketCheck
              data-icon="inline-start"
              aria-hidden="true"
            />
            {{ $t('checkout.success_view_tickets') }}
          </NuxtLink>
        </Button>

        <Button
          as-child
          variant="ghost"
          class="w-full rounded-full active:scale-[0.98] sm:w-auto"
        >
          <NuxtLink :to="eventPath">
            {{ $t('checkout.success_browse_event') }}
          </NuxtLink>
        </Button>
      </CardFooter>
    </Card>
  </main>
</template>
