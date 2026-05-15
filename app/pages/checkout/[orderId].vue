<script setup lang="ts">
import { apiRoutes } from '#shared/apiRoutes'
import { Field as VeeField, useForm } from 'vee-validate'
import { ArrowLeft, ChevronDown, UserRound, UsersRound, PencilLine, Ticket } from '@lucide/vue'
import type { SavedAttendeeFormInput, SavedAttendeeGender as SavedAttendeeGenderInput } from '#shared/schemas/savedAttendeeSchema'
import { checkoutCustomerSchema } from '#shared/schemas/ticketingSchema'
import type { CheckoutCustomerInput, CheckoutTicketHolderInput } from '#shared/schemas/ticketingSchema'
import type { ApiResponse } from '~~/types/api'
import type { CheckoutCancelData, CheckoutDetailData } from '~~/types/ticketing'
import type { SavedAttendeeModel } from '~~/types/models/saved-attendee'
import { toast } from 'vue-sonner'
import { apiRequest } from '@/utils/apiRequest'
import { parseApiError } from '@/utils/apiError'
import { getDisplayDateLocale } from '@/lib/localizedEvents'
import { formatCurrency, formatDateTime } from '@/lib/utils'
import { AgeBracket, OrderStatus, SavedAttendeeGender, TicketHolderSource } from '#shared/commonEnums'

const route = useRoute()
const { locale, t } = useI18n()
const { user } = useUserSession()
const orderId = computed(() => route.params.orderId.toString())
const holdPublicId = computed(() => typeof route.query.hold === 'string' ? route.query.hold : '')
const displayLocale = computed(() => getDisplayDateLocale(locale.value))
const isSubmitting = ref(false)
const isCancelling = ref(false)
const currentTime = ref(Date.now())
let holdClockIntervalId: number | null = null
let checkoutRefreshIntervalId: number | null = null
const accountHolderOptionValue = 'account-holder'

const { data: checkoutResponse, refresh } = await useAPI<ApiResponse<CheckoutDetailData>>(() => `/api/checkout/${orderId.value}`, {
  query: computed(() => ({ locale: locale.value })),
})
const checkout = computed(() => checkoutResponse.value?.data ?? null)

const { data: savedAttendeesResponse } = await useAPI<ApiResponse<SavedAttendeeModel[]>>(() => '/api/saved-attendees')
const savedAttendees = computed(() => savedAttendeesResponse.value?.data ?? [])

interface TicketHolderDraft {
  eventSeatId: number
  source: TicketHolderSource
  savedAttendeeId: string | null
  holder: DraftTicketHolder
  saveAsAttendee: boolean
}

type DraftTicketHolder = Omit<SavedAttendeeFormInput, 'birthDate'> & {
  birthDate?: string
}

const ticketHolderDrafts = ref<TicketHolderDraft[]>([])
const expandedDraftSeatIds = ref<number[]>([])

const defaultValues: CheckoutCustomerInput = {
  customerName: '',
  customerEmail: '',
  customerPhone: '',
  customerAgeBracket: AgeBracket.TwentyFiveToThirtyFour,
  customerGender: SavedAttendeeGender.PreferNotToSay,
}

const { handleSubmit, resetForm, values: formValues, meta: formMeta } = useForm({
  initialValues: { ...defaultValues },
  validationSchema: checkoutCustomerSchema,
})

const formInitializedOrderId = ref<number | null>(null)

const userProfile = computed(() => ({
  name: user.value?.name ?? '',
  email: user.value?.email ?? '',
  phone: '',
}))

function formatCurrency(cents: number) {
  return `${Intl.NumberFormat(getDisplayDateLocale(locale.value)).format(cents / 100)} VND`
}

function formatDateTime(value: string | Date) {
  return new Date(value).toLocaleString(getDisplayDateLocale(locale.value))
}

function getSavedAttendeeOptionLabel(attendee: SavedAttendeeModel) {
  return attendee.email ? `${attendee.legalName} · ${attendee.email}` : attendee.legalName
}

function getAccountHolderOptionLabel() {
  const name = formValues.customerName || userProfile.value.name || t('checkout.account_holder_option')
  const email = formValues.customerEmail || userProfile.value.email
  const accountLabel = t('checkout.account_holder_option')
  const profileLabel = email ? `${name} · ${email}` : name
  return `${accountLabel} · ${profileLabel}`
}

function isAccountHolderSelection(draft: TicketHolderDraft) {
  return draft.source === TicketHolderSource.Account || draft.savedAttendeeId === accountHolderOptionValue
}

function getHolderSelectValue(draft: TicketHolderDraft) {
  if (isAccountHolderSelection(draft)) {
    return accountHolderOptionValue
  }

  return draft.savedAttendeeId ?? undefined
}

function updateHolderSelection(draft: TicketHolderDraft, value: string) {
  if (value === accountHolderOptionValue) {
    draft.source = TicketHolderSource.SavedAttendee
    draft.savedAttendeeId = accountHolderOptionValue
    draft.holder = createAccountHolderDraft()
    return
  }

  draft.source = TicketHolderSource.SavedAttendee
  draft.savedAttendeeId = value
}

function getValidGender(value: string | undefined | null): SavedAttendeeGenderInput {
  if (value === SavedAttendeeGender.Female || value === SavedAttendeeGender.Male || value === SavedAttendeeGender.NonBinary || value === SavedAttendeeGender.PreferNotToSay) {
    return value
  }

  return SavedAttendeeGender.PreferNotToSay
}

function createAccountHolderDraft(): DraftTicketHolder {
  return {
    legalName: formValues.customerName ?? userProfile.value.name,
    preferredName: undefined,
    email: formValues.customerEmail ?? userProfile.value.email,
    phone: formValues.customerPhone ?? userProfile.value.phone,
    birthDate: undefined,
    gender: getValidGender(formValues.customerGender),
    guardianName: undefined,
    guardianEmail: undefined,
    guardianPhone: undefined,
    notes: undefined,
    accessibilityNeeds: undefined,
    isSelf: false,
  }
}

function createDraft(eventSeatId: number, source: TicketHolderSource = TicketHolderSource.Account): TicketHolderDraft {
  return {
    eventSeatId,
    source,
    savedAttendeeId: null,
    holder: createAccountHolderDraft(),
    saveAsAttendee: false,
  }
}

function findDraft(eventSeatId: number) {
  return ticketHolderDrafts.value.find(draft => draft.eventSeatId === eventSeatId)
}

function syncDraftsWithItems() {
  const items = checkout.value?.items ?? []
  const nextDrafts = items.map((item) => {
    const existing = findDraft(item.eventSeatId)
    if (existing) {
      return existing
    }

    return createDraft(item.eventSeatId)
  })

  ticketHolderDrafts.value = nextDrafts
  const seatIds = nextDrafts.map(draft => draft.eventSeatId)
  expandedDraftSeatIds.value = expandedDraftSeatIds.value.filter(seatId => seatIds.includes(seatId))
  if (expandedDraftSeatIds.value.length === 0 && seatIds.length > 0) {
    expandedDraftSeatIds.value = [seatIds[0]]
  }
}

function isDraftExpanded(eventSeatId: number) {
  return expandedDraftSeatIds.value.includes(eventSeatId)
}

function toggleDraftExpanded(eventSeatId: number) {
  if (isDraftExpanded(eventSeatId)) {
    expandedDraftSeatIds.value = expandedDraftSeatIds.value.filter(id => id !== eventSeatId)
    return
  }

  expandedDraftSeatIds.value = [...expandedDraftSeatIds.value, eventSeatId]
}

function setDraftSource(draft: TicketHolderDraft, source: string) {
  if (source === TicketHolderSource.Account) {
    draft.source = TicketHolderSource.Account
    draft.savedAttendeeId = null
    draft.holder = createAccountHolderDraft()
    return
  }

  if (source === TicketHolderSource.SavedAttendee) {
    draft.source = TicketHolderSource.SavedAttendee
    draft.savedAttendeeId = accountHolderOptionValue
    draft.holder = createAccountHolderDraft()
    return
  }

  draft.source = TicketHolderSource.Manual
  draft.savedAttendeeId = null
  draft.holder = {
    legalName: '',
    preferredName: undefined,
    email: '',
    phone: '',
    birthDate: undefined,
    gender: SavedAttendeeGender.PreferNotToSay,
    guardianName: undefined,
    guardianEmail: undefined,
    guardianPhone: undefined,
    notes: undefined,
    accessibilityNeeds: undefined,
    isSelf: false,
  }
}

watch(checkout, (value) => {
  if (!value?.order) {
    return
  }

  if (formInitializedOrderId.value === value.order.id && formMeta.value.dirty) {
    return
  }

  formInitializedOrderId.value = value.order.id

  resetForm({
    values: {
      customerName: value.order.customerName ?? '',
      customerEmail: value.order.customerEmail ?? '',
      customerPhone: value.order.customerPhone ?? '',
      customerAgeBracket: value.order.customerAgeBracket ?? AgeBracket.TwentyFiveToThirtyFour,
      customerGender: value.order.customerGender ?? SavedAttendeeGender.PreferNotToSay,
    },
  })
}, { immediate: true })

watch(() => checkout.value?.items, () => {
  syncDraftsWithItems()
}, { immediate: true })

watch(formValues, () => {
  for (const draft of ticketHolderDrafts.value) {
    if (!isAccountHolderSelection(draft)) {
      continue
    }

    draft.holder = createAccountHolderDraft()
  }
}, { deep: true })

watch(() => ticketHolderDrafts.value.map(draft => `${draft.eventSeatId}:${draft.source}:${draft.savedAttendeeId ?? ''}`), () => {
  for (const draft of ticketHolderDrafts.value) {
    if (!isAccountHolderSelection(draft)) {
      continue
    }

    draft.holder = createAccountHolderDraft()
  }
}, { immediate: true })

function validateDrafts() {
  const savedAttendeeDraft = ticketHolderDrafts.value.find(draft => draft.source === TicketHolderSource.SavedAttendee && !draft.savedAttendeeId)
  if (savedAttendeeDraft) {
    return t('checkout.saved_attendee_required')
  }

  const manualDraft = ticketHolderDrafts.value.find((draft) => {
    if (draft.source !== TicketHolderSource.Manual) {
      return false
    }

    const holder = draft.holder
    const hasName = holder.legalName.trim().length > 0
    const hasContact = Boolean(holder.email?.trim() || holder.phone?.trim() || holder.guardianEmail?.trim() || holder.guardianPhone?.trim())
    return !hasName || !hasContact
  })

  if (manualDraft) {
    return t('checkout.manual_holder_required')
  }

  return null
}

function toPayloadHolder(draft: TicketHolderDraft): CheckoutTicketHolderInput {
  if (isAccountHolderSelection(draft)) {
    return {
      eventSeatId: draft.eventSeatId,
      source: TicketHolderSource.Account,
      holder: {
        legalName: draft.holder.legalName,
        preferredName: draft.holder.preferredName,
        email: draft.holder.email,
        phone: draft.holder.phone,
        birthDate: draft.holder.birthDate && draft.holder.birthDate.trim() ? new Date(draft.holder.birthDate) : undefined,
        gender: draft.holder.gender,
        guardianName: draft.holder.guardianName,
        guardianEmail: draft.holder.guardianEmail,
        guardianPhone: draft.holder.guardianPhone,
        notes: draft.holder.notes,
        accessibilityNeeds: draft.holder.accessibilityNeeds,
        isSelf: draft.holder.isSelf,
      },
      saveAsAttendee: false,
    }
  }

  if (draft.source === TicketHolderSource.SavedAttendee) {
    return {
      eventSeatId: draft.eventSeatId,
      source: draft.source,
      savedAttendeeId: draft.savedAttendeeId ? Number(draft.savedAttendeeId) : undefined,
      saveAsAttendee: false,
    }
  }

  return {
    eventSeatId: draft.eventSeatId,
    source: draft.source,
    holder: {
      legalName: draft.holder.legalName,
      preferredName: draft.holder.preferredName,
      email: draft.holder.email,
      phone: draft.holder.phone,
      birthDate: draft.holder.birthDate && draft.holder.birthDate.trim() ? new Date(draft.holder.birthDate) : undefined,
      gender: draft.holder.gender,
      guardianName: draft.holder.guardianName,
      guardianEmail: draft.holder.guardianEmail,
      guardianPhone: draft.holder.guardianPhone,
      notes: draft.holder.notes,
      accessibilityNeeds: draft.holder.accessibilityNeeds,
      isSelf: draft.holder.isSelf,
    },
    saveAsAttendee: draft.saveAsAttendee,
  }
}

const checkoutSessionStartsAt = computed(() => checkout.value?.eventSession?.startsAt ?? null)
const primaryCheckoutItem = computed(() => checkout.value?.items[0] ?? null)
const confirmedTicketLabels = computed(() => {
  if (!checkout.value) {
    return []
  }

  return checkout.value.items.map(item => `${item.ticketLabel} · ${item.sectionLabel} ${item.seatLabel}`)
})
const orderConfirmedAtLabel = computed(() => {
  const confirmedAt = checkout.value?.order.confirmedAt ?? checkout.value?.order.updatedAt ?? null
  return confirmedAt ? formatDateTime(confirmedAt) : t('tickets.detail_unknown')
})
const orderStatusLabel = computed(() => {
  const status = checkout.value?.order.status
  if (status === OrderStatus.Confirmed) {
    return t('checkout.status_confirmed')
  }

  if (status === OrderStatus.Pending) {
    return t('checkout.status_pending')
  }

  if (status === OrderStatus.Cancelled) {
    return t('checkout.status_cancelled')
  }

  return status ? status.replaceAll('_', ' ') : t('tickets.detail_unknown')
})

const holdTimeRemainingMs = computed(() => {
  const expiresAt = checkout.value?.hold?.expiresAt
  const status = checkout.value?.order?.status

  if (!expiresAt || status === OrderStatus.Confirmed) {
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

async function navigateBackToEvent() {
  await navigateTo(checkout.value?.event?.slug ? `/events/${checkout.value.event.slug}` : '/events')
}

async function openTicketWallet() {
  await navigateTo('/tickets')
}

async function cancelCheckout() {
  if (!checkout.value?.order || isCancelling.value) {
    return
  }

  isCancelling.value = true

  try {
    const response = await apiRequest<ApiResponse<CheckoutCancelData>>(`/api/checkout/${orderId.value}`, {
      method: 'DELETE',
    })

    if (!response.success) {
      throw response
    }

    toast.success(t('checkout.cancelled_toast'))
    await navigateBackToEvent()
  }
  catch (error) {
    toast.error(parseApiError(error, t('checkout.cancel_error')).message)
    isCancelling.value = false
  }
}

const onSubmit = handleSubmit(
  async (values) => {
    if (!checkout.value?.order || !holdPublicId.value || isHoldExpired.value) {
      toast.error(t('checkout.hold_expired_toast'))
      return
    }

    const draftError = validateDrafts()
    if (draftError) {
      toast.error(draftError)
      return
    }

    isSubmitting.value = true

    try {
      const response = await apiRequest(apiRoutes.CHECKOUT_CONFIRM, {
        method: 'POST',
        body: {
          checkoutSessionId: checkout.value.order.checkoutSessionId,
          holdPublicId: holdPublicId.value,
          userId: checkout.value.order.userId,
          ...values,
          ticketHolders: ticketHolderDrafts.value.map(toPayloadHolder),
        },
      })
      if (!response.success) throw response

      toast.success(t('checkout.order_confirmed_toast'))
      await refresh()
    }
    catch (error) {
      toast.error(parseApiError(error, t('checkout.order_confirm_error')).message)
    }
    finally {
      isSubmitting.value = false
    }
  },
  ({ errors }) => {
    const firstError = Object.values(errors).flat().filter(Boolean)[0] || t('checkout.fix_highlighted')
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
  title: 'checkout.page_title',
  breadcrumb: 'checkout.breadcrumb',
  layout: 'empty',
  middleware: ['auth'],
})
</script>

<template>
  <main
    v-if="checkout"
    class="min-h-screen bg-[#050605] text-foreground"
  >
    <section class="grid items-start gap-4 bg-[radial-gradient(circle_at_10%_0%,rgba(124,58,237,0.16),transparent_30%),radial-gradient(circle_at_90%_15%,rgba(14,165,233,0.08),transparent_28%)] p-3 md:p-4 lg:grid-cols-[minmax(28rem,0.95fr)_minmax(24rem,0.85fr)]">
      <div class="rounded-[1.75rem] border border-white/10 bg-[#090a08]/95 shadow-2xl shadow-black/30">
        <form
          v-if="checkout.order.status !== OrderStatus.Confirmed"
          id="checkout-information-form"
          @submit.prevent="onSubmit"
        >
          <div class="border-b px-4 py-4 md:px-5">
            <p class="text-xs font-medium uppercase tracking-[0.22em] text-primary">
              {{ $t('checkout.ticket_assignments_title') }}
            </p>
            <h2 class="mt-1 text-2xl font-semibold tracking-tight">
              {{ $t('checkout.finish_order_title') }}
            </h2>
            <p class="mt-1 max-w-3xl text-sm text-muted-foreground">
              {{ $t('checkout.ticket_assignments_desc') }}
            </p>
          </div>

          <div class="px-4 py-4 md:px-5">
            <div class="space-y-4 pb-4">
              <section class="rounded-[1.5rem] border bg-muted/20 p-4">
                <div class="mb-4">
                  <p class="text-xs font-medium uppercase tracking-[0.22em] text-muted-foreground">
                    {{ $t('checkout.review_order') }}
                  </p>
                  <p class="mt-1 text-sm text-muted-foreground">
                    {{ $t('checkout.finish_order_desc') }}
                  </p>
                </div>

                <FieldGroup>
                  <div class="grid gap-4 md:grid-cols-2">
                    <VeeField
                      v-slot="{ field, errors }"
                      name="customerName"
                    >
                      <Field :data-invalid="!!errors.length">
                        <FieldLabel for="checkout-customer-name">{{ $t('checkout.full_name') }}</FieldLabel>
                        <Input
                          id="checkout-customer-name"
                          :model-value="field.value"
                          :placeholder="$t('checkout.full_name')"
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
                        <FieldLabel for="checkout-customer-email">{{ $t('checkout.email') }}</FieldLabel>
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
                        <FieldLabel for="checkout-customer-phone">{{ $t('checkout.phone') }}</FieldLabel>
                        <Input
                          id="checkout-customer-phone"
                          :model-value="field.value"
                          placeholder="+84 90 000 0000"
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
                      name="customerGender"
                    >
                      <Field :data-invalid="!!errors.length">
                        <FieldLabel for="checkout-customer-gender">{{ $t('checkout.gender') }}</FieldLabel>
                        <Select
                          :model-value="field.value"
                          @update:model-value="field.onChange"
                        >
                          <SelectTrigger
                            id="checkout-customer-gender"
                            :aria-invalid="!!errors.length"
                            @blur="field.onBlur"
                          >
                            <SelectValue :placeholder="field.value ? undefined : $t('checkout.gender_placeholder')" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem :value="SavedAttendeeGender.Female">{{ $t('checkout.gender_female') }}</SelectItem>
                            <SelectItem :value="SavedAttendeeGender.Male">{{ $t('checkout.gender_male') }}</SelectItem>
                            <SelectItem :value="SavedAttendeeGender.NonBinary">{{ $t('checkout.gender_non_binary') }}</SelectItem>
                            <SelectItem :value="SavedAttendeeGender.PreferNotToSay">{{ $t('checkout.gender_prefer_not') }}</SelectItem>
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
              </section>

              <article
                v-for="draft in ticketHolderDrafts"
                :key="draft.eventSeatId"
                class="overflow-hidden rounded-[1.5rem] border bg-card shadow-sm"
              >
                <button
                  type="button"
                  class="flex w-full items-center justify-between gap-4 border-b px-4 py-4 text-left md:px-5"
                  @click="toggleDraftExpanded(draft.eventSeatId)"
                >
                  <div class="min-w-0">
                    <p class="font-medium">
                      {{ checkout.items.find(item => item.eventSeatId === draft.eventSeatId)?.ticketLabel }}
                    </p>
                    <p class="text-sm text-muted-foreground">
                      {{ checkout.items.find(item => item.eventSeatId === draft.eventSeatId)?.sectionLabel }} · {{ checkout.items.find(item => item.eventSeatId === draft.eventSeatId)?.rowLabel }} · {{ checkout.items.find(item => item.eventSeatId === draft.eventSeatId)?.seatLabel }}
                    </p>
                  </div>

                  <div class="flex items-center gap-3 text-xs text-muted-foreground">
                    <span class="inline-flex items-center gap-1 rounded-full border bg-muted/30 px-2.5 py-1">
                      <UserRound
                        v-if="draft.source === TicketHolderSource.Account"
                        class="size-3.5"
                      />
                      <UsersRound
                        v-else-if="draft.source === TicketHolderSource.SavedAttendee"
                        class="size-3.5"
                      />
                      <PencilLine
                        v-else
                        class="size-3.5"
                      />
                      {{ draft.source === TicketHolderSource.Account ? $t('checkout.use_buyer_details') : draft.source === TicketHolderSource.SavedAttendee ? $t('checkout.select_saved_attendee') : $t('checkout.enter_manually') }}
                    </span>
                    <ChevronDown
                      class="size-4 transition-transform"
                      :class="isDraftExpanded(draft.eventSeatId) ? 'rotate-180' : ''"
                    />
                  </div>
                </button>

                <div
                  v-if="isDraftExpanded(draft.eventSeatId)"
                  class="space-y-4 px-4 pb-5 pt-4 md:px-5"
                >
                  <div class="grid gap-3 md:grid-cols-3">
                    <button
                      type="button"
                      :class="[
                        'inline-flex items-center justify-center gap-2 rounded-xl border px-3 py-2 text-sm font-medium transition',
                        draft.source === TicketHolderSource.Account ? 'border-primary/30 bg-primary/10 text-primary' : 'bg-muted/20 text-muted-foreground hover:text-foreground',
                      ]"
                      @click="setDraftSource(draft, TicketHolderSource.Account)"
                    >
                      <UserRound class="size-4" />
                      {{ $t('checkout.use_buyer_details') }}
                    </button>
                    <button
                      type="button"
                      :class="[
                        'inline-flex items-center justify-center gap-2 rounded-xl border px-3 py-2 text-sm font-medium transition',
                        draft.source === TicketHolderSource.SavedAttendee ? 'border-primary/30 bg-primary/10 text-primary' : 'bg-muted/20 text-muted-foreground hover:text-foreground',
                      ]"
                      @click="setDraftSource(draft, TicketHolderSource.SavedAttendee)"
                    >
                      <UsersRound class="size-4" />
                      {{ $t('checkout.select_saved_attendee') }}
                    </button>
                    <button
                      type="button"
                      :class="[
                        'inline-flex items-center justify-center gap-2 rounded-xl border px-3 py-2 text-sm font-medium transition',
                        draft.source === TicketHolderSource.Manual ? 'border-primary/30 bg-primary/10 text-primary' : 'bg-muted/20 text-muted-foreground hover:text-foreground',
                      ]"
                      @click="setDraftSource(draft, TicketHolderSource.Manual)"
                    >
                      <PencilLine class="size-4" />
                      {{ $t('checkout.enter_manually') }}
                    </button>
                  </div>

                  <div
                    v-if="draft.source === TicketHolderSource.SavedAttendee"
                    class="space-y-2"
                  >
                    <FieldLabel :for="`attendee-${draft.eventSeatId}`">{{ $t('checkout.saved_attendee_label') }}</FieldLabel>
                    <Select
                      :model-value="getHolderSelectValue(draft)"
                      @update:model-value="value => updateHolderSelection(draft, String(value))"
                    >
                      <SelectTrigger
                        :id="`attendee-${draft.eventSeatId}`"
                        class="w-full bg-background/60"
                      >
                        <SelectValue :placeholder="$t('checkout.attendee_placeholder')" />
                      </SelectTrigger>
                      <SelectContent
                        position="item-aligned"
                        class="max-w-[calc(100vw-2rem)]"
                      >
                        <SelectItem
                          :value="accountHolderOptionValue"
                          class="min-h-10 max-w-full"
                        >
                          {{ getAccountHolderOptionLabel() }}
                        </SelectItem>
                        <SelectSeparator v-if="savedAttendees.length > 0" />
                        <SelectItem
                          v-for="attendee in savedAttendees"
                          :key="attendee.id"
                          :value="String(attendee.id)"
                          class="min-h-10 max-w-full"
                        >
                          {{ getSavedAttendeeOptionLabel(attendee) }}
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div
                    v-if="draft.source !== TicketHolderSource.SavedAttendee"
                    class="grid gap-4 md:grid-cols-2"
                  >
                    <div class="space-y-2">
                      <FieldLabel :for="`name-${draft.eventSeatId}`">{{ $t('checkout.legal_name') }}</FieldLabel>
                      <Input
                        :id="`name-${draft.eventSeatId}`"
                        v-model="draft.holder.legalName"
                        :readonly="draft.source === TicketHolderSource.Account"
                        :placeholder="$t('checkout.legal_name')"
                      />
                    </div>
                    <div class="space-y-2">
                      <FieldLabel :for="`email-${draft.eventSeatId}`">{{ $t('checkout.email') }}</FieldLabel>
                      <Input
                        :id="`email-${draft.eventSeatId}`"
                        v-model="draft.holder.email"
                        type="email"
                        :readonly="draft.source === TicketHolderSource.Account"
                        :placeholder="$t('checkout.email')"
                      />
                    </div>
                    <div class="space-y-2">
                      <FieldLabel :for="`phone-${draft.eventSeatId}`">{{ $t('checkout.phone') }}</FieldLabel>
                      <Input
                        :id="`phone-${draft.eventSeatId}`"
                        v-model="draft.holder.phone"
                        :readonly="draft.source === TicketHolderSource.Account"
                        :placeholder="$t('checkout.phone')"
                      />
                    </div>
                    <div class="space-y-2">
                      <FieldLabel :for="`gender-${draft.eventSeatId}`">{{ $t('checkout.gender') }}</FieldLabel>
                      <Select
                        v-model="draft.holder.gender"
                        :disabled="draft.source === TicketHolderSource.Account"
                      >
                        <SelectTrigger :id="`gender-${draft.eventSeatId}`">
                          <SelectValue :placeholder="$t('checkout.gender_placeholder')" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem :value="SavedAttendeeGender.Female">{{ $t('checkout.gender_female') }}</SelectItem>
                          <SelectItem :value="SavedAttendeeGender.Male">{{ $t('checkout.gender_male') }}</SelectItem>
                          <SelectItem :value="SavedAttendeeGender.NonBinary">{{ $t('checkout.gender_non_binary') }}</SelectItem>
                          <SelectItem :value="SavedAttendeeGender.PreferNotToSay">{{ $t('checkout.gender_prefer_not') }}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div class="space-y-2">
                      <FieldLabel :for="`birth-${draft.eventSeatId}`">{{ $t('checkout.birth_date') }}</FieldLabel>
                      <Input
                        :id="`birth-${draft.eventSeatId}`"
                        v-model="draft.holder.birthDate"
                        type="date"
                      />
                    </div>
                    <div class="space-y-2">
                      <FieldLabel :for="`preferred-${draft.eventSeatId}`">{{ $t('checkout.preferred_name') }}</FieldLabel>
                      <Input
                        :id="`preferred-${draft.eventSeatId}`"
                        v-model="draft.holder.preferredName"
                        :placeholder="$t('checkout.preferred_name')"
                      />
                    </div>
                    <div class="space-y-2">
                      <FieldLabel :for="`guardian-name-${draft.eventSeatId}`">{{ $t('checkout.guardian_name') }}</FieldLabel>
                      <Input
                        :id="`guardian-name-${draft.eventSeatId}`"
                        v-model="draft.holder.guardianName"
                      />
                    </div>
                    <div class="space-y-2">
                      <FieldLabel :for="`guardian-email-${draft.eventSeatId}`">{{ $t('checkout.guardian_email') }}</FieldLabel>
                      <Input
                        :id="`guardian-email-${draft.eventSeatId}`"
                        v-model="draft.holder.guardianEmail"
                        type="email"
                      />
                    </div>
                    <div class="space-y-2 md:col-span-2">
                      <FieldLabel :for="`guardian-phone-${draft.eventSeatId}`">{{ $t('checkout.guardian_phone') }}</FieldLabel>
                      <Input
                        :id="`guardian-phone-${draft.eventSeatId}`"
                        v-model="draft.holder.guardianPhone"
                      />
                    </div>
                    <div class="space-y-2 md:col-span-2">
                      <FieldLabel :for="`notes-${draft.eventSeatId}`">{{ $t('checkout.notes') }}</FieldLabel>
                      <Input
                        :id="`notes-${draft.eventSeatId}`"
                        v-model="draft.holder.notes"
                      />
                    </div>
                    <div class="space-y-2 md:col-span-2">
                      <FieldLabel :for="`access-${draft.eventSeatId}`">{{ $t('checkout.accessibility_needs') }}</FieldLabel>
                      <Input
                        :id="`access-${draft.eventSeatId}`"
                        v-model="draft.holder.accessibilityNeeds"
                      />
                    </div>
                  </div>
                </div>
              </article>
            </div>
          </div>
        </form>

        <section
          v-else
          class="overflow-hidden"
        >
          <div class="border-b border-white/10 px-5 py-5 md:px-6">
            <p class="text-xs font-semibold uppercase tracking-[0.24em] text-violet-300">
              {{ $t('checkout.order_confirmed') }}
            </p>
            <h2 class="mt-2 text-3xl font-semibold tracking-[-0.04em] text-white">
              {{ $t('checkout.tickets_in_wallet') }}
            </h2>
            <p class="mt-2 max-w-xl text-sm leading-6 text-white/60">
              {{ $t('checkout.qr_ready_checkout_desc') }}
            </p>
            <Button
              type="button"
              class="mt-5 rounded-full px-5"
              @click="openTicketWallet"
            >
              {{ $t('checkout.open_my_tickets') }}
            </Button>
          </div>

          <div class="px-5 py-5 md:px-6">
            <div class="grid items-start gap-5 xl:grid-cols-[minmax(17rem,21rem)_minmax(0,1fr)]">
              <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
                <TicketQrCard
                  v-for="(ticket, ticketIndex) in checkout.tickets"
                  :key="ticket.id"
                  class="h-full min-w-0"
                  :payload="ticket.qrToken"
                  :title="$t('tickets.digital_entry_pass')"
                  :subtitle="ticket.attendeeEmail"
                  :ticket-label="confirmedTicketLabels[ticketIndex] ?? null"
                  :instruction="null"
                  :show-payload="false"
                />
              </div>

              <div class="space-y-4">
                <div class="rounded-[1.5rem] border border-white/10 bg-white/[0.04] p-5 shadow-xl shadow-black/20">
                  <p class="text-sm font-semibold text-white">
                    {{ $t('checkout.qr_gate_title') }}
                  </p>
                  <p class="mt-2 text-sm leading-7 text-white/60">
                    {{ $t('checkout.qr_gate_desc') }}
                  </p>
                </div>

                <div class="grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
                  <div class="rounded-2xl border border-emerald-400/20 bg-emerald-500/10 p-4">
                    <p class="text-xs uppercase tracking-[0.18em] text-emerald-300">
                      {{ $t('common.status') }}
                    </p>
                    <p class="mt-2 text-base font-semibold text-emerald-100">
                      {{ orderStatusLabel }}
                    </p>
                  </div>
                  <div class="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                    <p class="text-xs uppercase tracking-[0.18em] text-white/45">
                      {{ $t('checkout.ticket_assignments_title') }}
                    </p>
                    <p class="mt-2 text-base font-semibold text-white">
                      {{ checkout.tickets.length }}
                    </p>
                  </div>
                  <div class="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                    <p class="text-xs uppercase tracking-[0.18em] text-white/45">
                      Email
                    </p>
                    <p class="mt-2 truncate text-base font-semibold text-white">
                      {{ checkout.tickets[0]?.attendeeEmail ?? checkout.order.customerEmail }}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>

      <Card
        v-if="checkout.order.status === OrderStatus.Confirmed"
        class="overflow-hidden border-white/10 bg-[#10110e]/95 text-white shadow-2xl shadow-black/35"
      >
        <CardHeader class="border-b border-white/10 px-6 py-6">
          <div class="flex items-center justify-between gap-4">
            <div class="flex items-center gap-3">
              <div class="flex size-10 shrink-0 items-center justify-center rounded-2xl border border-violet-400/25 bg-violet-500/10 text-violet-300">
                <Ticket class="size-5" />
              </div>
              <div>
                <p class="text-xs font-semibold uppercase tracking-[0.22em] text-violet-300">
                  {{ $t('checkout.summary_label') }}
                </p>
                <CardTitle class="mt-1 text-2xl tracking-[-0.04em] text-white">
                  {{ $t('checkout.order_total') }}
                </CardTitle>
              </div>
            </div>
            <span class="rounded-full border border-emerald-400/20 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-200">
              {{ orderStatusLabel }}
            </span>
          </div>
        </CardHeader>

        <CardContent class="space-y-4 p-6">
          <div
            v-if="primaryCheckoutItem"
            class="rounded-[1.5rem] border border-white/10 bg-black/25 p-5"
          >
            <div class="flex items-start justify-between gap-4">
              <div class="min-w-0">
                <p class="text-lg font-semibold text-white">
                  {{ primaryCheckoutItem.ticketLabel }}
                </p>
                <p class="mt-1 text-sm text-white/55">
                  {{ primaryCheckoutItem.sectionLabel }} · {{ primaryCheckoutItem.rowLabel }} · {{ primaryCheckoutItem.seatLabel }}
                </p>
              </div>
              <p class="shrink-0 font-mono text-sm font-semibold text-white">
                {{ formatCurrency(primaryCheckoutItem.unitPriceCents) }}
              </p>
            </div>
          </div>

          <div class="rounded-[1.5rem] bg-[#1b1d15] p-5 shadow-inner shadow-white/5">
            <p class="text-sm text-white/55">
              {{ $t('checkout.order_total') }}
            </p>
            <p class="mt-2 text-4xl font-semibold tracking-[-0.06em] text-white">
              {{ formatCurrency(checkout.order.amountCents) }}
            </p>
          </div>

          <div class="rounded-[1.5rem] border border-white/10 bg-black/25 p-5">
            <p class="text-sm font-semibold text-white">
              {{ checkout.event?.title ?? $t('checkout.page_title') }}
            </p>
            <p class="mt-1 text-sm text-white/55">
              {{ orderConfirmedAtLabel }}
            </p>
            <p class="mt-2 text-xs text-white/40">
              {{ $t('checkout.order_confirmed') }}
            </p>
          </div>
        </CardContent>
      </Card>

      <Card
        v-else
        class="flex flex-col lg:sticky lg:top-4 lg:max-h-[calc(100dvh-2rem)] lg:overflow-hidden"
      >
        <CardHeader class="border-b py-4">
          <div class="space-y-4">
            <div class="flex items-start gap-3">
              <Button
                variant="outline"
                size="icon-sm"
                class="shrink-0"
                :aria-label="$t('common.back')"
                type="button"
                @click="navigateBackToEvent"
              >
                <ArrowLeft />
              </Button>

              <div class="min-w-0">
                <CardTitle class="truncate text-xl">
                  {{ checkout.event?.title ?? $t('checkout.page_title') }}
                </CardTitle>
                <p class="mt-1 text-sm text-muted-foreground">
                  {{ checkout.eventSession?.label ?? 'Session' }} &middot; {{ checkoutSessionStartsAt ? formatDateTime(checkoutSessionStartsAt) : $t('checkout.session_time_tba') }}
                </p>
              </div>
            </div>

            <div class="flex flex-wrap gap-2 text-xs text-muted-foreground">
              <div class="inline-flex items-center gap-2 rounded-md border bg-muted/30 px-2.5 py-1.5">
                <span class="font-medium text-foreground">{{ checkout.items.length }}</span>
                <span>{{ $t('common.held') }}</span>
              </div>
              <div class="inline-flex items-center gap-2 rounded-md border bg-muted/30 px-2.5 py-1.5">
                <span class="font-medium text-foreground">{{ ticketHolderDrafts.length }}</span>
                <span>{{ $t('checkout.ticket_assignments_title') }}</span>
              </div>
              <div class="inline-flex items-center gap-2 rounded-md border bg-muted/30 px-2.5 py-1.5">
                <span class="font-medium text-foreground">{{ checkout.order.status }}</span>
                <span>{{ $t('common.status') }}</span>
              </div>
            </div>

            <div class="flex items-center gap-2.5 pt-1">
              <div class="flex size-8 shrink-0 items-center justify-center rounded-xl border bg-primary/10 text-primary">
                <Ticket class="size-4" />
              </div>
              <p class="text-base font-semibold">
                {{ $t('checkout.order_total') }}
              </p>
            </div>
          </div>
        </CardHeader>

        <CardContent class="flex min-h-0 flex-1 flex-col p-0">
          <ScrollArea class="min-h-0 flex-1 px-4 py-4 md:px-5">
            <div class="space-y-3 pb-2">
              <div
                v-if="holdCountdownLabel && checkout.order.status !== OrderStatus.Confirmed"
                :class="[
                  'rounded-[1.5rem] px-5 py-4',
                  isHoldExpired ? 'bg-destructive/10 text-destructive' : 'bg-muted/50 text-foreground',
                ]"
              >
                <p class="text-sm text-muted-foreground">{{ $t('checkout.hold_timer') }}</p>
                <p class="mt-2 text-3xl font-semibold tracking-[-0.05em]">{{ holdCountdownLabel }}</p>
                <p class="mt-2 text-sm leading-7 text-muted-foreground">
                  {{ isHoldExpired ? $t('checkout.hold_expired_note') : $t('checkout.hold_active_note') }}
                </p>
              </div>

              <ItemGroup>
                <Item
                  v-for="item in checkout.items"
                  :key="item.id"
                  variant="outline"
                  class="bg-background/80"
                >
                  <ItemMedia variant="icon">
                    <Ticket class="size-4" />
                  </ItemMedia>
                  <ItemContent>
                    <ItemTitle>{{ item.ticketLabel }}</ItemTitle>
                    <ItemDescription>{{ item.sectionLabel }} · {{ item.rowLabel }} · {{ item.seatLabel }}</ItemDescription>
                  </ItemContent>
                  <div class="ml-auto text-right">
                    <p class="font-mono text-sm font-semibold text-foreground">{{ formatCurrency(item.unitPriceCents) }}</p>
                  </div>
                </Item>
              </ItemGroup>

              <div class="rounded-[1.5rem] bg-muted/50 px-5 py-4">
                <p class="text-sm text-muted-foreground">{{ $t('checkout.order_total') }}</p>
                <p class="mt-2 text-3xl font-semibold tracking-[-0.05em]">{{ formatCurrency(checkout.order.amountCents) }}</p>
              </div>
            </div>
          </ScrollArea>

          <div
            v-if="checkout.order.status !== OrderStatus.Confirmed"
            class="shrink-0 space-y-2 border-t bg-background/95 px-4 pb-4 pt-3 md:px-5"
          >
            <Button
              type="submit"
              form="checkout-information-form"
              class="w-full rounded-full shadow-[0_10px_30px_-10px_hsl(var(--primary)/0.75)]"
              size="lg"
              :is-loading="isSubmitting"
              :disabled="isHoldExpired || isCancelling"
            >
              {{ $t('checkout.confirm_order') }}
            </Button>

            <AlertDialog>
              <AlertDialogTrigger as-child>
                <Button
                  type="button"
                  variant="outline"
                  class="w-full rounded-full"
                  size="lg"
                  :disabled="isSubmitting || isCancelling"
                >
                  {{ $t('common.cancel') }}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>{{ $t('checkout.cancel_checkout_title') }}</AlertDialogTitle>
                  <AlertDialogDescription>
                    {{ $t('checkout.cancel_checkout_desc') }}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel :disabled="isCancelling">
                    {{ $t('checkout.keep_checkout') }}
                  </AlertDialogCancel>
                  <AlertDialogAction
                    :disabled="isCancelling"
                    @click="cancelCheckout"
                  >
                    {{ $t('checkout.confirm_cancel') }}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </CardContent>
      </Card>
    </section>
  </main>
</template>
