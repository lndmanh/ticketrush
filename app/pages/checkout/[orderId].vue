<script setup lang="ts">
import { Field as VeeField, useForm } from 'vee-validate'
import type { SavedAttendeeFormInput, SavedAttendeeGender } from '#shared/schemas/savedAttendeeSchema'
import { checkoutCustomerSchema } from '#shared/schemas/ticketingSchema'
import type { CheckoutCustomerInput, CheckoutTicketHolderInput } from '#shared/schemas/ticketingSchema'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
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
import { toast } from 'vue-sonner'

const { t } = useI18n()
const route = useRoute()
const orderId = computed(() => route.params.orderId.toString())
const holdPublicId = computed(() => typeof route.query.hold === 'string' ? route.query.hold : '')
const isSubmitting = ref(false)
const currentTime = ref(Date.now())
let holdClockIntervalId: number | null = null
let checkoutRefreshIntervalId: number | null = null

const { data: checkoutResponse, refresh } = await useFetch(() => `/api/checkout/${orderId.value}`)
const checkout = computed(() => checkoutResponse.value?.data ?? null)

const { data: savedAttendeesResponse } = await useFetch('/api/saved-attendees')
const savedAttendees = computed(() => savedAttendeesResponse.value?.data ?? [])

type TicketHolderSource = 'account' | 'saved-attendee' | 'manual'

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

const defaultValues: CheckoutCustomerInput = {
  customerName: '',
  customerEmail: '',
  customerPhone: '',
  customerAgeBracket: '25-34',
  customerGender: 'prefer-not-to-say',
}

const { handleSubmit, resetForm, values: formValues, meta: formMeta } = useForm({
  initialValues: { ...defaultValues },
  validationSchema: checkoutCustomerSchema,
})

const formInitializedOrderId = ref<number | null>(null)

function getValidGender(value: string | undefined | null): SavedAttendeeGender {
  if (value === 'female' || value === 'male' || value === 'non-binary' || value === 'prefer-not-to-say') {
    return value
  }

  return 'prefer-not-to-say'
}

function createAccountHolderDraft(): DraftTicketHolder {
  return {
    legalName: formValues.customerName ?? '',
    preferredName: undefined,
    email: formValues.customerEmail ?? '',
    phone: formValues.customerPhone ?? '',
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

function createDraft(eventSeatId: number, source: TicketHolderSource = 'account'): TicketHolderDraft {
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
      customerAgeBracket: value.order.customerAgeBracket ?? '25-34',
      customerGender: value.order.customerGender ?? 'prefer-not-to-say',
    },
  })
}, { immediate: true })

watch(() => checkout.value?.items, () => {
  syncDraftsWithItems()
}, { immediate: true })

watch(formValues, () => {
  for (const draft of ticketHolderDrafts.value) {
    if (draft.source !== 'account') {
      continue
    }

    draft.holder = createAccountHolderDraft()
  }
}, { deep: true })

watch(() => ticketHolderDrafts.value.map(draft => `${draft.eventSeatId}:${draft.source}:${draft.savedAttendeeId ?? ''}`), () => {
  for (const draft of ticketHolderDrafts.value) {
    if (draft.source !== 'account') {
      continue
    }

    draft.holder = createAccountHolderDraft()
  }
}, { immediate: true })

function validateDrafts() {
  const savedAttendeeDraft = ticketHolderDrafts.value.find(draft => draft.source === 'saved-attendee' && !draft.savedAttendeeId)
  if (savedAttendeeDraft) {
    return 'Please select a saved attendee for every ticket using that option.'
  }

  const manualDraft = ticketHolderDrafts.value.find((draft) => {
    if (draft.source !== 'manual') {
      return false
    }

    const holder = draft.holder
    const hasName = holder.legalName.trim().length > 0
    const hasContact = Boolean(holder.email?.trim() || holder.phone?.trim() || holder.guardianEmail?.trim() || holder.guardianPhone?.trim())
    return !hasName || !hasContact
  })

  if (manualDraft) {
    return 'Please provide a legal name and at least one contact method for each manual ticket holder.'
  }

  return null
}

function toPayloadHolder(draft: TicketHolderDraft): CheckoutTicketHolderInput {
  if (draft.source === 'saved-attendee') {
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
      await $fetch('/api/checkout/confirm', {
        method: 'POST',
        body: {
          checkoutSessionId: checkout.value.order.checkoutSessionId,
          holdPublicId: holdPublicId.value,
          userId: checkout.value.order.userId,
          ...values,
          ticketHolders: ticketHolderDrafts.value.map(toPayloadHolder),
        },
      })

      toast.success(t('checkout.order_confirmed_toast'))
      await refresh()
    }
    catch (error) {
      let message = t('checkout.order_confirm_error')

      if (error && typeof error === 'object' && 'data' in error) {
        const errorData = error.data
        if (errorData && typeof errorData === 'object' && 'message' in errorData && typeof errorData.message === 'string') {
          message = errorData.message
        }
      }

      toast.error(message)
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
  layout: 'dashboard',
  middleware: ['auth'],
})
</script>

<template>
  <main
    v-if="checkout"
    class="space-y-8 pb-8 pt-6"
  >
    <section class="grid gap-6 xl:grid-cols-[1fr_0.92fr]">
      <div class="space-y-4">
        <div class="space-y-3">
          <h1 class="text-3xl font-semibold tracking-tight">
            {{ checkout.order.status === 'confirmed' ? $t('checkout.order_confirmed') : $t('checkout.review_order') }}
          </h1>
          <p class="max-w-[40rem] text-base leading-8 text-muted-foreground">
            {{ $t('checkout.demo_note') }}
          </p>
        </div>
      </div>

      <div class="overflow-hidden rounded-xl border bg-card text-card-foreground shadow-sm">
        <div class="space-y-4 p-6 md:p-8">
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
              {{ $t('checkout.hold_timer') }}
            </p>
            <p class="mt-2 text-3xl font-semibold tracking-[-0.05em]">
              {{ holdCountdownLabel }}
            </p>
            <p class="mt-2 text-sm leading-7 text-muted-foreground">
              {{ isHoldExpired ? $t('checkout.hold_expired_note') : $t('checkout.hold_active_note') }}
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
              {{ $t('checkout.order_total') }}
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
              {{ checkoutSessionStartsAt ? new Date(checkoutSessionStartsAt).toLocaleString() : $t('checkout.session_time_tba') }}
            </p>
          </div>
        </div>
      </div>
    </section>

    <section
      v-if="checkout.order.status !== 'confirmed'"
      class="overflow-hidden rounded-xl border bg-card text-card-foreground shadow-sm"
    >
      <form
        class="space-y-6 p-6 md:p-8"
        @submit.prevent="onSubmit"
      >
        <div class="grid gap-8 lg:grid-cols-2">
          <div class="space-y-3">
            <h2 class="text-3xl font-semibold tracking-[-0.05em]">
              {{ $t('checkout.finish_order_title') }}
            </h2>
            <p class="text-sm leading-7 text-muted-foreground">
              {{ $t('checkout.finish_order_desc') }}
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
                    {{ $t('checkout.full_name') }}
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
                    {{ $t('checkout.email') }}
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
                    {{ $t('checkout.phone') }}
                  </FieldLabel>
                  <Input
                    id="checkout-customer-phone"
                    :model-value="field.value"
                    placeholder="+84 90 000 0000"
                    :aria-invalid="!!errors.length"
                    @update:model-value="field.onChange"
                  />
                  <FieldDescription>{{ $t('checkout.phone_desc') }}</FieldDescription>
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
                      {{ $t('checkout.age_bracket') }}
                    </FieldLabel>
                    <Select
                      :model-value="field.value"
                      @update:model-value="field.onChange"
                    >
                      <SelectTrigger
                        id="checkout-age-bracket"
                        :aria-invalid="!!errors.length"
                        @blur="field.onBlur"
                      >
                        <SelectValue :placeholder="field.value ? undefined : $t('checkout.age_bracket_placeholder')" />
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
                      {{ $t('checkout.gender') }}
                    </FieldLabel>
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
          </div>
        </div>

        <div class="space-y-6 border-t border-border pt-8">
          <div class="space-y-2">
            <h3 class="text-2xl font-semibold tracking-[-0.04em]">
              {{ $t('checkout.ticket_assignments_title') }}
            </h3>
            <p class="text-sm leading-7 text-muted-foreground">
              {{ $t('checkout.ticket_assignments_desc') }}
            </p>
          </div>

          <div class="space-y-4">
            <div
              v-for="draft in ticketHolderDrafts"
              :key="draft.eventSeatId"
              class="rounded-[1.5rem] border border-black/5 bg-white/70 p-5 dark:border-white/10 dark:bg-white/[0.03]"
            >
              <div class="mb-4 flex items-center justify-between gap-3 border-b border-border pb-4">
                <div>
                  <p class="font-medium">
                    {{ checkout.items.find(item => item.eventSeatId === draft.eventSeatId)?.ticketLabel }}
                  </p>
                  <p class="text-sm text-muted-foreground">
                    {{ checkout.items.find(item => item.eventSeatId === draft.eventSeatId)?.sectionLabel }} · {{ checkout.items.find(item => item.eventSeatId === draft.eventSeatId)?.rowLabel }} · {{ checkout.items.find(item => item.eventSeatId === draft.eventSeatId)?.seatLabel }}
                  </p>
                </div>
              </div>

              <div class="space-y-4">
                <div class="space-y-2">
                  <FieldLabel :for="`source-${draft.eventSeatId}`">
                    {{ $t('checkout.assignment_method') }}
                  </FieldLabel>
                  <Select v-model="draft.source">
                    <SelectTrigger :id="`source-${draft.eventSeatId}`">
                      <SelectValue :placeholder="$t('checkout.assignment_placeholder')" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="account">
                        {{ $t('checkout.use_buyer_details') }}
                      </SelectItem>
                      <SelectItem value="saved-attendee">
                        {{ $t('checkout.select_saved_attendee') }}
                      </SelectItem>
                      <SelectItem value="manual">
                        {{ $t('checkout.enter_manually') }}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div
                  v-if="draft.source === 'account'"
                  class="rounded-xl border border-black/5 bg-accent/50 p-4 text-sm text-muted-foreground dark:border-white/10"
                >
                  {{ $t('checkout.auto_synced_note') }}
                </div>

                <div
                  v-if="draft.source === 'saved-attendee'"
                  class="space-y-2"
                >
                  <FieldLabel :for="`attendee-${draft.eventSeatId}`">
                    {{ $t('checkout.saved_attendee_label') }}
                  </FieldLabel>
                  <Select v-model="draft.savedAttendeeId">
                    <SelectTrigger :id="`attendee-${draft.eventSeatId}`">
                      <SelectValue :placeholder="$t('checkout.attendee_placeholder')" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem
                        v-for="attendee in savedAttendees"
                        :key="attendee.id"
                        :value="String(attendee.id)"
                      >
                        {{ attendee.legalName }}<span v-if="attendee.email"> · {{ attendee.email }}</span>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div
                  v-if="draft.source !== 'saved-attendee'"
                  class="grid gap-4 md:grid-cols-2"
                >
                  <div class="space-y-2">
                    <FieldLabel :for="`name-${draft.eventSeatId}`">
                      {{ $t('checkout.legal_name') }}
                    </FieldLabel>
                    <Input
                      :id="`name-${draft.eventSeatId}`"
                      v-model="draft.holder.legalName"
                      :readonly="draft.source === 'account'"
                      placeholder="Legal name"
                    />
                  </div>

                  <div class="space-y-2">
                    <FieldLabel :for="`email-${draft.eventSeatId}`">
                      {{ $t('checkout.email') }}
                    </FieldLabel>
                    <Input
                      :id="`email-${draft.eventSeatId}`"
                      v-model="draft.holder.email"
                      type="email"
                      :readonly="draft.source === 'account'"
                      placeholder="Email"
                    />
                  </div>

                  <div class="space-y-2">
                    <FieldLabel :for="`phone-${draft.eventSeatId}`">
                      {{ $t('checkout.phone') }}
                    </FieldLabel>
                    <Input
                      :id="`phone-${draft.eventSeatId}`"
                      v-model="draft.holder.phone"
                      :readonly="draft.source === 'account'"
                      placeholder="Phone"
                    />
                  </div>

                  <div class="space-y-2">
                    <FieldLabel :for="`gender-${draft.eventSeatId}`">
                      {{ $t('checkout.gender') }}
                    </FieldLabel>
                    <Select
                      v-model="draft.holder.gender"
                      :disabled="draft.source === 'account'"
                    >
                      <SelectTrigger :id="`gender-${draft.eventSeatId}`">
                        <SelectValue :placeholder="$t('checkout.gender_placeholder')" />
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
                  </div>

                  <div class="space-y-2">
                    <FieldLabel :for="`birth-${draft.eventSeatId}`">
                      {{ $t('checkout.birth_date') }}
                    </FieldLabel>
                    <Input
                      :id="`birth-${draft.eventSeatId}`"
                      v-model="draft.holder.birthDate"
                      type="date"
                      placeholder="Birth date"
                    />
                  </div>

                  <div class="space-y-2">
                    <FieldLabel :for="`preferred-${draft.eventSeatId}`">
                      {{ $t('checkout.preferred_name') }}
                    </FieldLabel>
                    <Input
                      :id="`preferred-${draft.eventSeatId}`"
                      v-model="draft.holder.preferredName"
                      placeholder="Preferred name"
                    />
                  </div>

                  <div class="space-y-2">
                    <FieldLabel :for="`guardian-name-${draft.eventSeatId}`">
                      {{ $t('checkout.guardian_name') }}
                    </FieldLabel>
                    <Input
                      :id="`guardian-name-${draft.eventSeatId}`"
                      v-model="draft.holder.guardianName"
                      placeholder="Guardian name"
                    />
                  </div>

                  <div class="space-y-2">
                    <FieldLabel :for="`guardian-email-${draft.eventSeatId}`">
                      {{ $t('checkout.guardian_email') }}
                    </FieldLabel>
                    <Input
                      :id="`guardian-email-${draft.eventSeatId}`"
                      v-model="draft.holder.guardianEmail"
                      type="email"
                      placeholder="Guardian email"
                    />
                  </div>

                  <div class="space-y-2">
                    <FieldLabel :for="`guardian-phone-${draft.eventSeatId}`">
                      {{ $t('checkout.guardian_phone') }}
                    </FieldLabel>
                    <Input
                      :id="`guardian-phone-${draft.eventSeatId}`"
                      v-model="draft.holder.guardianPhone"
                      placeholder="Guardian phone"
                    />
                  </div>

                  <div class="space-y-2 md:col-span-2">
                    <FieldLabel :for="`notes-${draft.eventSeatId}`">
                      {{ $t('checkout.notes') }}
                    </FieldLabel>
                    <Input
                      :id="`notes-${draft.eventSeatId}`"
                      v-model="draft.holder.notes"
                      placeholder="Notes"
                    />
                  </div>

                  <div class="space-y-2 md:col-span-2">
                    <FieldLabel :for="`access-${draft.eventSeatId}`">
                      {{ $t('checkout.accessibility_needs') }}
                    </FieldLabel>
                    <Input
                      :id="`access-${draft.eventSeatId}`"
                      v-model="draft.holder.accessibilityNeeds"
                      placeholder="Accessibility needs"
                    />
                  </div>

                  <div
                    v-if="draft.source === 'manual'"
                    class="flex items-center justify-between rounded-xl border border-black/5 bg-accent/30 p-4 md:col-span-2 dark:border-white/10"
                  >
                    <div class="space-y-0.5">
                      <FieldLabel
                        :for="`save-${draft.eventSeatId}`"
                        class="text-base"
                      >
                        {{ $t('checkout.save_as_attendee_label') }}
                      </FieldLabel>
                      <p class="text-sm text-muted-foreground">
                        {{ $t('checkout.save_as_attendee_desc') }}
                      </p>
                    </div>
                    <Switch
                      :id="`save-${draft.eventSeatId}`"
                      v-model="draft.saveAsAttendee"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <Button
          type="submit"
          class="w-full rounded-full"
          size="lg"
          :is-loading="isSubmitting"
          :disabled="isHoldExpired"
        >
          {{ $t('checkout.confirm_order') }}
        </Button>
      </form>
    </section>

    <section
      v-else
      class="grid gap-6 lg:grid-cols-2"
    >
      <TicketQrCard
        v-for="ticket in checkout.tickets"
        :key="ticket.id"
        :payload="ticket.qrToken"
        :title="ticket.publicId"
        :subtitle="ticket.attendeeEmail"
      />

      <div class="rounded-xl border bg-card text-card-foreground shadow-sm lg:col-span-2">
        <div class="flex flex-col gap-4 p-6 md:flex-row md:items-center md:justify-between md:p-8">
          <div>
            <p class="mt-3 text-sm text-muted-foreground">
              {{ $t('checkout.tickets_in_wallet') }}
            </p>
          </div>

          <Button
            as-child
            class="rounded-full"
          >
            <NuxtLink to="/tickets">
              {{ $t('checkout.open_my_tickets') }}
            </NuxtLink>
          </Button>
        </div>
      </div>
    </section>
  </main>
</template>
