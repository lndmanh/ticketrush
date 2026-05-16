<script setup lang="ts">
import { apiRoutes } from '#shared/apiRoutes'
import { Field as VeeField, useForm } from 'vee-validate'
import { ArrowLeft, ChevronDown, CreditCard, Landmark, UserRound, UsersRound, PencilLine, Ticket, WalletCards } from '@lucide/vue'
import type { SavedAttendeeFormInput, SavedAttendeeGender as SavedAttendeeGenderInput } from '#shared/schemas/savedAttendeeSchema'
import { checkoutCustomerSchema, confirmCheckoutSchema } from '#shared/schemas/ticketingSchema'
import type { CheckoutCustomerInput, CheckoutTicketHolderInput } from '#shared/schemas/ticketingSchema'
import type { ApiResponse } from '~~/types/api'
import type { CheckoutCancelData, CheckoutDetailData } from '~~/types/ticketing'
import type { SavedAttendeeModel } from '~~/types/models/saved-attendee'
import { toast } from 'vue-sonner'
import { apiRequest } from '@/utils/apiRequest'
import { parseApiError } from '@/utils/apiError'
import { getDisplayDateLocale } from '@/lib/localizedEvents'
import { AgeBracket, OrderPaymentMethod, OrderStatus, SavedAttendeeGender, SeatPricingSource, TicketHolderSource } from '#shared/commonEnums'

const route = useRoute()
const { locale, t } = useI18n()
const orderId = computed(() => route.params.orderId.toString())
const holdPublicId = computed(() => typeof route.query.hold === 'string' ? route.query.hold : '')
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
const savedAttendees = computed(() => savedAttendeesResponse.value?.success ? savedAttendeesResponse.value.data : [])

interface TicketHolderDraft {
  eventSeatId: number
  source: TicketHolderSource
  savedAttendeeId: string | null
  holder: DraftTicketHolder
  saveAsAttendee: boolean
  guardianSource: TicketHolderSource
  guardianSavedAttendeeId: string | null
}

interface CheckoutSummarySeat {
  id: number
  eventSeatId: number
  ticketLabel: string
  sectionLabel: string | null
  rowLabel: string | null
  seatLabel: string
  unitPriceCents: number
  pricingSource?: SeatPricingSource
}

interface CheckoutSectionSummary {
  sectionLabel: string
  quantity: number
  subtotalCents: number
  seats: CheckoutSummarySeat[]
  customSeats: CheckoutSummarySeat[]
}

interface PaymentMethodOption {
  value: OrderPaymentMethod
  label: string
  description: string
}

type DraftTicketHolder = Omit<SavedAttendeeFormInput, 'birthDate'> & {
  birthDate?: string
}

const ticketHolderDrafts = ref<TicketHolderDraft[]>([])
const expandedDraftSeatIds = ref<number[]>([])
const selectedPaymentMethod = ref<OrderPaymentMethod | null>(null)

const paymentMethodOptions = computed<PaymentMethodOption[]>(() => [
  {
    value: OrderPaymentMethod.Visa,
    label: t('checkout.payment_visa'),
    description: '•••• 4242',
  },
  {
    value: OrderPaymentMethod.Mastercard,
    label: t('checkout.payment_mastercard'),
    description: '•••• 5454',
  },
  {
    value: OrderPaymentMethod.Paypal,
    label: t('checkout.payment_paypal'),
    description: 'wallet@example.com',
  },
  {
    value: OrderPaymentMethod.Bank,
    label: t('checkout.payment_bank'),
    description: 'Vietcombank',
  },
])

const defaultValues: CheckoutCustomerInput = {
  customerName: '',
  customerEmail: '',
  customerPhone: '',
  customerAgeBracket: AgeBracket.TwentyFiveToThirtyFour,
  customerGender: SavedAttendeeGender.PreferNotToSay,
}

const selfAttendee = computed(() => savedAttendees.value.find(attendee => attendee.isSelf) ?? null)

const { handleSubmit, resetForm, values: formValues, meta: formMeta } = useForm({
  initialValues: { ...defaultValues },
  validationSchema: checkoutCustomerSchema,
})

const formInitializedOrderId = ref<number | null>(null)
const paymentInitializedOrderId = ref<number | null>(null)
const billingDefaultedFromSelfOrderId = ref<number | null>(null)

function formatCurrency(cents: number) {
  return `${Intl.NumberFormat(getDisplayDateLocale(locale.value)).format(cents / 100)} VND`
}

function formatSeatLocation(parts: Array<string | null | undefined>) {
  return parts.filter((part): part is string => typeof part === 'string' && part.length > 0).join(' · ')
}

function getCheckoutSectionLabel(value: string | null | undefined) {
  return value && value.length > 0 ? value : t('tickets.detail_unknown')
}

function getDraftModeBadgeLabel(draft: TicketHolderDraft) {
  const name = draft.holder.preferredName?.trim() || draft.holder.legalName?.trim()
  if (name) {
    return name
  }

  if (draft.source === TicketHolderSource.Account) {
    return t('checkout.use_buyer_details')
  }
  if (draft.source === TicketHolderSource.SavedAttendee) {
    return t('checkout.select_saved_attendee')
  }
  return t('checkout.enter_manually')
}

function formatDateTime(value: string | Date) {
  return new Date(value).toLocaleString(getDisplayDateLocale(locale.value))
}

function getSavedAttendeeOptionLabel(attendee: SavedAttendeeModel) {
  return attendee.email ? `${attendee.legalName} · ${attendee.email}` : attendee.legalName
}

function getPaymentMethodLabel(payment: OrderPaymentMethod | null | undefined) {
  return paymentMethodOptions.value.find(option => option.value === payment)?.label ?? t('tickets.detail_unknown')
}

function isAccountHolderSelection(draft: TicketHolderDraft) {
  return draft.source === TicketHolderSource.Account || draft.savedAttendeeId === accountHolderOptionValue
}

function isValidSavedAttendeeSelection(value: string) {
  if (value === accountHolderOptionValue) {
    return true
  }

  const attendeeId = Number(value)
  return Number.isInteger(attendeeId) && savedAttendees.value.some(attendee => attendee.id === attendeeId)
}

function getValidSavedAttendeeId(value: string | null) {
  if (!value || value === accountHolderOptionValue) {
    return null
  }

  return isValidSavedAttendeeSelection(value) ? value : null
}

function getHolderSelectValue(draft: TicketHolderDraft) {
  if (isAccountHolderSelection(draft)) {
    return accountHolderOptionValue
  }

  return draft.savedAttendeeId ?? undefined
}

function preserveOptionalHolderFields(holder: DraftTicketHolder) {
  return {
    birthDate: holder.birthDate,
    preferredName: holder.preferredName,
    notes: holder.notes,
    accessibilityNeeds: holder.accessibilityNeeds,
    guardianName: holder.guardianName,
    guardianEmail: holder.guardianEmail,
    guardianPhone: holder.guardianPhone,
  }
}

function restoreOptionalHolderFields(holder: DraftTicketHolder, preserved: ReturnType<typeof preserveOptionalHolderFields>) {
  holder.birthDate = preserved.birthDate
  holder.preferredName = preserved.preferredName
  holder.notes = preserved.notes
  holder.accessibilityNeeds = preserved.accessibilityNeeds
  holder.guardianName = preserved.guardianName
  holder.guardianEmail = preserved.guardianEmail
  holder.guardianPhone = preserved.guardianPhone
}

function updateHolderSelection(draft: TicketHolderDraft, value: string | undefined) {
  if (!value) {
    return
  }

  if (value === accountHolderOptionValue) {
    const preserved = preserveOptionalHolderFields(draft.holder)
    draft.source = TicketHolderSource.Account
    draft.savedAttendeeId = null
    draft.holder = createAccountHolderDraft()
    restoreOptionalHolderFields(draft.holder, preserved)
    if (draft.guardianSource === TicketHolderSource.Manual) {
      draft.holder.guardianName = preserved.guardianName
      draft.holder.guardianEmail = preserved.guardianEmail
      draft.holder.guardianPhone = preserved.guardianPhone
    }
    if (draft.guardianSource === TicketHolderSource.SavedAttendee) {
      draft.guardianSavedAttendeeId = null
      draft.guardianSource = TicketHolderSource.Account
    }
    return
  }

  if (!isValidSavedAttendeeSelection(value)) {
    return
  }

  draft.source = TicketHolderSource.SavedAttendee
  draft.savedAttendeeId = value
}

function refreshAccountHolderDraft(draft: TicketHolderDraft) {
  const preserved = preserveOptionalHolderFields(draft.holder)
  draft.holder = createAccountHolderDraft()
  restoreOptionalHolderFields(draft.holder, preserved)
}

function refreshAccountHolderDraftFromSelfAttendee(draft: TicketHolderDraft) {
  const preserved = preserveOptionalHolderFields(draft.holder)
  draft.holder = createAccountHolderDraft()

  if (draft.guardianSource === TicketHolderSource.Manual) {
    draft.holder.guardianName = preserved.guardianName
    draft.holder.guardianEmail = preserved.guardianEmail
    draft.holder.guardianPhone = preserved.guardianPhone
  }
}

function getValidGender(value: string | undefined | null): SavedAttendeeGenderInput {
  if (value === SavedAttendeeGender.Female || value === SavedAttendeeGender.Male || value === SavedAttendeeGender.NonBinary || value === SavedAttendeeGender.PreferNotToSay) {
    return value
  }

  return SavedAttendeeGender.PreferNotToSay
}

const selfAttendeeProfile = computed(() => ({
  name: selfAttendee.value?.preferredName || selfAttendee.value?.legalName || '',
  email: selfAttendee.value?.email ?? '',
  phone: selfAttendee.value?.phone ?? '',
  gender: getValidGender(selfAttendee.value?.gender),
}))

const selfAttendeeDraftSignature = computed(() => {
  const attendee = selfAttendee.value

  if (!attendee) {
    return ''
  }

  return [
    attendee.id,
    attendee.legalName,
    attendee.preferredName ?? '',
    attendee.email ?? '',
    attendee.phone ?? '',
    attendee.birthDate ? String(attendee.birthDate) : '',
    attendee.gender ?? '',
    attendee.guardianName ?? '',
    attendee.guardianEmail ?? '',
    attendee.guardianPhone ?? '',
    attendee.notes ?? '',
    attendee.accessibilityNeeds ?? '',
  ].join('|')
})

function createAccountHolderDraft(): DraftTicketHolder {
  return {
    legalName: selfAttendee.value?.legalName ?? selfAttendeeProfile.value.name,
    preferredName: selfAttendee.value?.preferredName ?? undefined,
    email: selfAttendeeProfile.value.email,
    phone: selfAttendeeProfile.value.phone,
    birthDate: getSavedAttendeeDraftBirthDate(selfAttendee.value?.birthDate ?? null),
    gender: selfAttendeeProfile.value.gender,
    guardianName: selfAttendee.value?.guardianName ?? undefined,
    guardianEmail: selfAttendee.value?.guardianEmail ?? undefined,
    guardianPhone: selfAttendee.value?.guardianPhone ?? undefined,
    notes: selfAttendee.value?.notes ?? undefined,
    accessibilityNeeds: selfAttendee.value?.accessibilityNeeds ?? undefined,
    isSelf: true,
  }
}

function createDraft(eventSeatId: number, source: TicketHolderSource = TicketHolderSource.Account): TicketHolderDraft {
  return {
    eventSeatId,
    source,
    savedAttendeeId: null,
    holder: createAccountHolderDraft(),
    saveAsAttendee: false,
    guardianSource: TicketHolderSource.Account,
    guardianSavedAttendeeId: null,
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

const checkoutItemBySeatId = computed(() => {
  const itemBySeatId = new Map<number, CheckoutSummarySeat>()

  for (const item of checkout.value?.items ?? []) {
    itemBySeatId.set(item.eventSeatId, {
      id: item.id,
      eventSeatId: item.eventSeatId,
      ticketLabel: item.ticketLabel,
      sectionLabel: item.sectionLabel,
      rowLabel: item.rowLabel,
      seatLabel: item.seatLabel,
      unitPriceCents: item.unitPriceCents,
    })
  }

  return itemBySeatId
})

const checkoutSectionSummaries = computed(() => {
  const sectionByLabel = new Map<string, CheckoutSectionSummary>()

  for (const item of checkout.value?.items ?? []) {
    const sectionLabel = getCheckoutSectionLabel(item.sectionLabel)
    const summarySeat: CheckoutSummarySeat = {
      id: item.id,
      eventSeatId: item.eventSeatId,
      ticketLabel: item.ticketLabel,
      sectionLabel: item.sectionLabel,
      rowLabel: item.rowLabel,
      seatLabel: item.seatLabel,
      unitPriceCents: item.unitPriceCents,
      pricingSource: item.pricingSource,
    }
    const existingSection = sectionByLabel.get(sectionLabel)

    if (existingSection) {
      existingSection.quantity += 1
      existingSection.subtotalCents += item.unitPriceCents
      existingSection.seats.push(summarySeat)
      if (item.pricingSource === SeatPricingSource.SeatOverride) {
        existingSection.customSeats.push(summarySeat)
      }
      continue
    }

    sectionByLabel.set(sectionLabel, {
      sectionLabel,
      quantity: 1,
      subtotalCents: item.unitPriceCents,
      seats: [summarySeat],
      customSeats: item.pricingSource === SeatPricingSource.SeatOverride ? [summarySeat] : [],
    })
  }

  return Array.from(sectionByLabel.values())
})

function getCheckoutItem(eventSeatId: number) {
  return checkoutItemBySeatId.value.get(eventSeatId) ?? null
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

function parseDraftBirthDate(value: string | undefined) {
  if (!value) {
    return null
  }

  const match = /^([0-9]{4})-([0-9]{2})-([0-9]{2})$/.exec(value)
  if (!match) {
    return null
  }

  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  const birthDate = new Date(Date.UTC(year, month - 1, day))

  if (
    birthDate.getUTCFullYear() !== year
    || birthDate.getUTCMonth() !== month - 1
    || birthDate.getUTCDate() !== day
  ) {
    return null
  }

  return birthDate
}

function getPayloadBirthDate(value: string | undefined) {
  return parseDraftBirthDate(value) ?? undefined
}

function getAgeAtDate(birthDate: Date, referenceDate: Date) {
  let age = referenceDate.getFullYear() - birthDate.getFullYear()
  const monthDelta = referenceDate.getMonth() - birthDate.getMonth()
  const dayDelta = referenceDate.getDate() - birthDate.getDate()

  if (monthDelta < 0 || (monthDelta === 0 && dayDelta < 0)) {
    age -= 1
  }

  return age
}

function isUnderEighteen(draft: TicketHolderDraft) {
  const birthDate = draft.source === TicketHolderSource.SavedAttendee
    ? parseSavedAttendeeBirthDate(getSavedAttendeeById(draft.savedAttendeeId)?.birthDate)
    : parseDraftBirthDate(draft.holder.birthDate)
  if (!birthDate) {
    return false
  }

  const referenceDate = checkoutSessionStartsAt.value ? new Date(checkoutSessionStartsAt.value) : new Date()
  if (Number.isNaN(referenceDate.getTime())) {
    return false
  }

  return getAgeAtDate(birthDate, referenceDate) < 18
}

function getSavedAttendeeById(value: string | null) {
  if (!value) {
    return null
  }

  const attendeeId = Number(value)
  if (!Number.isInteger(attendeeId)) {
    return null
  }

  return savedAttendees.value.find(attendee => attendee.id === attendeeId) ?? null
}

function parseSavedAttendeeBirthDate(value: Date | string | null | undefined) {
  if (!value) {
    return null
  }

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value
  }

  if (typeof value === 'string') {
    const strictDate = parseDraftBirthDate(value)
    if (strictDate) {
      return strictDate
    }

    if (/^\d{4}-\d{2}-\d{2}T/.test(value)) {
      const parsed = new Date(value)
      return Number.isNaN(parsed.getTime()) ? null : parsed
    }
  }

  return null
}

function getSavedAttendeePayloadBirthDate(value: SavedAttendeeModel['birthDate']) {
  return parseSavedAttendeeBirthDate(value) ?? undefined
}

function getSavedAttendeeDraftBirthDate(value: SavedAttendeeModel['birthDate']) {
  const birthDate = parseSavedAttendeeBirthDate(value)
  if (!birthDate) {
    return undefined
  }

  const [datePart] = birthDate.toISOString().split('T')
  return datePart ?? undefined
}

function applyGuardianDetails(draft: TicketHolderDraft, name: string, email: string | null | undefined, phone: string | null | undefined) {
  draft.holder.guardianName = name
  draft.holder.guardianEmail = email ?? undefined
  draft.holder.guardianPhone = phone ?? undefined
}

function setManualGuardianField(draft: TicketHolderDraft, field: 'guardianName' | 'guardianEmail' | 'guardianPhone', value: string | null | undefined) {
  draft.guardianSource = TicketHolderSource.Manual
  draft.guardianSavedAttendeeId = null
  draft.holder[field] = value ?? undefined
}

function applyGuardianSource(draft: TicketHolderDraft) {
  if (draft.guardianSource === TicketHolderSource.Account) {
    applyGuardianDetails(
      draft,
      formValues.customerName,
      formValues.customerEmail,
      formValues.customerPhone,
    )
    return
  }

  if (draft.guardianSource === TicketHolderSource.SavedAttendee) {
    const attendee = getSavedAttendeeById(draft.guardianSavedAttendeeId)
    if (!attendee) {
      return
    }

    applyGuardianDetails(draft, attendee.legalName, attendee.email, attendee.phone)
  }
}

function setGuardianSource(draft: TicketHolderDraft, source: TicketHolderSource) {
  if (source === TicketHolderSource.Account) {
    draft.guardianSource = TicketHolderSource.Account
    draft.guardianSavedAttendeeId = null
    applyGuardianSource(draft)
    return
  }

  if (source === TicketHolderSource.SavedAttendee) {
    draft.guardianSource = TicketHolderSource.SavedAttendee
    draft.guardianSavedAttendeeId = null
    draft.holder.guardianName = undefined
    draft.holder.guardianEmail = undefined
    draft.holder.guardianPhone = undefined
    return
  }

  draft.guardianSource = TicketHolderSource.Manual
  draft.guardianSavedAttendeeId = null
}

function updateGuardianSavedAttendee(draft: TicketHolderDraft, value: string | undefined) {
  if (!value || !isValidSavedAttendeeSelection(value)) {
    draft.guardianSavedAttendeeId = null
    return
  }

  draft.guardianSavedAttendeeId = value
  applyGuardianSource(draft)
}

function setDraftSource(draft: TicketHolderDraft, source: TicketHolderSource) {
  if (source === TicketHolderSource.Account) {
    draft.source = TicketHolderSource.Account
    draft.savedAttendeeId = null
    draft.holder = createAccountHolderDraft()
    return
  }

  if (source === TicketHolderSource.SavedAttendee) {
    draft.source = TicketHolderSource.SavedAttendee
    draft.savedAttendeeId = null
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

watch([checkout, selfAttendeeProfile], ([value]) => {
  if (!value?.order) {
    return
  }

  const hasSelfDefaults = Boolean(
    selfAttendeeProfile.value.name
    || selfAttendeeProfile.value.email
    || selfAttendeeProfile.value.phone,
  )

  const isNewOrder = formInitializedOrderId.value !== value.order.id
  const canApplyLateSelfDefaults = !isNewOrder
    && billingDefaultedFromSelfOrderId.value !== value.order.id
    && hasSelfDefaults
    && !formMeta.value.dirty

  if (!isNewOrder && !canApplyLateSelfDefaults) {
    return
  }

  if (formMeta.value.dirty) {
    return
  }

  formInitializedOrderId.value = value.order.id
  if (hasSelfDefaults) {
    billingDefaultedFromSelfOrderId.value = value.order.id
  }

  resetForm({
    values: {
      customerName: value.order.customerName || selfAttendeeProfile.value.name,
      customerEmail: value.order.customerEmail || selfAttendeeProfile.value.email,
      customerPhone: value.order.customerPhone || selfAttendeeProfile.value.phone,
      customerAgeBracket: value.order.customerAgeBracket || defaultValues.customerAgeBracket,
      customerGender: getValidGender(value.order.customerGender || selfAttendeeProfile.value.gender),
    },
  })
}, { immediate: true })

watch(selfAttendeeDraftSignature, () => {
  for (const draft of ticketHolderDrafts.value) {
    if (isAccountHolderSelection(draft)) {
      refreshAccountHolderDraftFromSelfAttendee(draft)
    }
  }
})

watch(checkout, (value) => {
  if (!value?.order || paymentInitializedOrderId.value === value.order.id) {
    return
  }

  paymentInitializedOrderId.value = value.order.id
  selectedPaymentMethod.value = value.order.payment ?? null
}, { immediate: true })

watch(() => checkout.value?.items, () => {
  syncDraftsWithItems()
}, { immediate: true })

watch(formValues, () => {
  for (const draft of ticketHolderDrafts.value) {
    const shouldSyncAccountGuardian = isUnderEighteen(draft) && draft.guardianSource === TicketHolderSource.Account

    if (shouldSyncAccountGuardian) {
      applyGuardianSource(draft)
    }
  }
}, { deep: true })

watch(
  () => ticketHolderDrafts.value.map(draft => [
    draft.eventSeatId,
    draft.holder.birthDate ?? '',
    draft.guardianSource,
    draft.guardianSavedAttendeeId ?? '',
    formValues.customerName,
    formValues.customerEmail,
    formValues.customerPhone,
    savedAttendees.value.map(attendee => [
      attendee.id,
      attendee.legalName,
      attendee.email ?? '',
      attendee.phone ?? '',
      attendee.birthDate ? String(attendee.birthDate) : '',
    ].join('|')).join(','),
  ].join(':')),
  () => {
    for (const draft of ticketHolderDrafts.value) {
      if (!isUnderEighteen(draft)) {
        continue
      }

      if (draft.guardianSource === TicketHolderSource.Account || draft.guardianSource === TicketHolderSource.SavedAttendee) {
        applyGuardianSource(draft)
      }
    }
  },
)

watch(() => ticketHolderDrafts.value.map(draft => `${draft.eventSeatId}:${draft.source}:${draft.savedAttendeeId ?? ''}`), () => {
  for (const draft of ticketHolderDrafts.value) {
    if (!isAccountHolderSelection(draft)) {
      continue
    }

    refreshAccountHolderDraft(draft)
  }
}, { immediate: true })

function validateDrafts() {
  const savedAttendeeDraft = ticketHolderDrafts.value.find(draft => draft.source === TicketHolderSource.SavedAttendee && !getValidSavedAttendeeId(draft.savedAttendeeId))
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
        birthDate: getPayloadBirthDate(draft.holder.birthDate),
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
    const savedAttendeeId = getValidSavedAttendeeId(draft.savedAttendeeId)
    const savedAttendee = getSavedAttendeeById(savedAttendeeId)
    const needsGuardianDetails = isUnderEighteen(draft)
    return {
      eventSeatId: draft.eventSeatId,
      source: draft.source,
      savedAttendeeId: savedAttendeeId ? Number(savedAttendeeId) : undefined,
      holder: savedAttendee
        ? {
            legalName: savedAttendee.legalName,
            preferredName: savedAttendee.preferredName ?? undefined,
            email: savedAttendee.email ?? undefined,
            phone: savedAttendee.phone ?? undefined,
            birthDate: getSavedAttendeePayloadBirthDate(savedAttendee.birthDate),
            gender: getValidGender(savedAttendee.gender),
            guardianName: needsGuardianDetails ? draft.holder.guardianName : undefined,
            guardianEmail: needsGuardianDetails ? draft.holder.guardianEmail : undefined,
            guardianPhone: needsGuardianDetails ? draft.holder.guardianPhone : undefined,
            notes: savedAttendee.notes ?? undefined,
            accessibilityNeeds: savedAttendee.accessibilityNeeds ?? undefined,
            isSelf: savedAttendee.isSelf,
          }
        : undefined,
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
      birthDate: getPayloadBirthDate(draft.holder.birthDate),
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

async function createAttendee() {
  // redirect to attendee in a new tab to preserve checkout state in case of accidental navigation
  await navigateTo('/attendees', {
    open: {
      target: '_blank',
    },
  })
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

    if (!selectedPaymentMethod.value) {
      toast.error(t('checkout.payment_method_required'))
      return
    }

    isSubmitting.value = true

    try {
      const payload = {
        checkoutSessionId: checkout.value.order.checkoutSessionId,
        holdPublicId: holdPublicId.value,
        ...values,
        payment: selectedPaymentMethod.value,
        ticketHolders: ticketHolderDrafts.value.map(toPayloadHolder),
      }
      const payloadResult = confirmCheckoutSchema.safeParse(payload)
      if (!payloadResult.success) {
        toast.error(payloadResult.error.issues[0]?.message ?? t('checkout.fix_highlighted'))
        return
      }

      const response = await apiRequest(apiRoutes.CHECKOUT_CONFIRM, {
        method: 'POST',
        body: payloadResult.data,
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
    class="min-h-screen"
  >
    <section class="grid items-start gap-4 p-3 md:p-4 lg:grid-cols-[minmax(28rem,0.95fr)_minmax(24rem,0.85fr)]">
      <form
        v-if="checkout.order.status !== OrderStatus.Confirmed"
        id="checkout-information-form"
        @submit.prevent="onSubmit"
      >
        <div class="px-4 md:px-5">
          <div class="flex items-start justify-between gap-3">
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

            <div class="min-w-0 flex-1">
              <h2 class="text-2xl font-semibold tracking-tight">
                {{ checkout.event?.title ?? $t('checkout.page_title') }}
              </h2>
              <p class="mt-1 text-sm text-muted-foreground">
                {{ checkout.eventSession?.label ?? 'Session' }} &middot; {{ checkoutSessionStartsAt ? formatDateTime(checkoutSessionStartsAt) : $t('checkout.session_time_tba') }}
              </p>
            </div>

            <div
              v-if="holdCountdownLabel && checkout.order.status !== OrderStatus.Confirmed"
              :class="[
                'shrink-0 rounded-2xl border px-3 py-2 text-right',
                isHoldExpired ? 'border-destructive/30 bg-destructive/10 text-destructive' : 'bg-muted/40 text-foreground',
              ]"
            >
              <p class="font-mono text-lg font-semibold leading-none tracking-[-0.04em]">
                {{ holdCountdownLabel }}
              </p>
            </div>
          </div>
        </div>

        <div class="space-y-4 pb-4">
          <article
            v-for="draft in ticketHolderDrafts"
            :key="draft.eventSeatId"
            class="overflow-hidden rounded-[1.5rem] border bg-card shadow-sm"
          >
            <button
              type="button"
              class="flex w-full items-center justify-between gap-4 border-b px-4 py-4 text-left md:px-5"
              :aria-expanded="isDraftExpanded(draft.eventSeatId)"
              :aria-controls="`draft-panel-${draft.eventSeatId}`"
              @click="toggleDraftExpanded(draft.eventSeatId)"
            >
              <div class="min-w-0">
                <p class="font-medium">
                  {{ getCheckoutItem(draft.eventSeatId)?.ticketLabel }}
                </p>
                <p class="text-sm text-muted-foreground">
                  {{ getCheckoutItem(draft.eventSeatId)?.sectionLabel }} · {{ getCheckoutItem(draft.eventSeatId)?.rowLabel }} · {{ getCheckoutItem(draft.eventSeatId)?.seatLabel }}
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
                  {{ getDraftModeBadgeLabel(draft) }}
                </span>
                <ChevronDown
                  class="size-4 transition-transform"
                  :class="isDraftExpanded(draft.eventSeatId) ? 'rotate-180' : ''"
                />
              </div>
            </button>

            <div
              v-if="isDraftExpanded(draft.eventSeatId)"
              :id="`draft-panel-${draft.eventSeatId}`"
              class="space-y-4 px-4 pb-5 pt-4 md:px-5"
            >
              <div class="grid gap-3 md:grid-cols-3">
                <button
                  type="button"
                  :aria-pressed="draft.source === TicketHolderSource.Account"
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
                  :aria-pressed="draft.source === TicketHolderSource.SavedAttendee"
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
                  :aria-pressed="draft.source === TicketHolderSource.Manual"
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
                <template v-if="savedAttendees.length > 0">
                  <FieldLabel :for="`attendee-${draft.eventSeatId}`">
                    {{ $t('checkout.saved_attendee_label') }}
                  </FieldLabel>
                  <Select
                    :model-value="getHolderSelectValue(draft)"
                    @update:model-value="value => updateHolderSelection(draft, typeof value === 'string' ? value : undefined)"
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
                        v-for="attendee in savedAttendees"
                        :key="attendee.id"
                        :value="String(attendee.id)"
                        class="min-h-10 max-w-full"
                      >
                        {{ getSavedAttendeeOptionLabel(attendee) }}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </template>
                <template v-else>
                  <Empty>
                    <EmptyHeader>
                      <EmptyMedia variant="icon">
                        <UsersRound />
                      </EmptyMedia>
                      <EmptyTitle>{{ $t('checkout.no_saved_attendees') }}</EmptyTitle>
                    </EmptyHeader>
                    <EmptyContent>
                      <div class="flex gap-2">
                        <Button @click="createAttendee">
                          {{ $t('checkout.create_attendee') }}
                        </Button>
                      </div>
                    </EmptyContent>
                  </Empty>
                </template>
              </div>

              <div
                v-if="draft.source !== TicketHolderSource.SavedAttendee"
                class="grid gap-4 md:grid-cols-2"
              >
                <div class="space-y-2">
                  <FieldLabel :for="`name-${draft.eventSeatId}`">
                    {{ $t('checkout.legal_name') }}
                  </FieldLabel>
                  <Input
                    :id="`name-${draft.eventSeatId}`"
                    v-model="draft.holder.legalName"
                    :readonly="draft.source === TicketHolderSource.Account"
                    :placeholder="$t('checkout.legal_name')"
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
                    :readonly="draft.source === TicketHolderSource.Account"
                    :placeholder="$t('checkout.email')"
                  />
                </div>
                <div class="space-y-2">
                  <FieldLabel :for="`phone-${draft.eventSeatId}`">
                    {{ $t('checkout.phone') }}
                  </FieldLabel>
                  <Input
                    :id="`phone-${draft.eventSeatId}`"
                    v-model="draft.holder.phone"
                    :readonly="draft.source === TicketHolderSource.Account"
                    :placeholder="$t('checkout.phone')"
                  />
                </div>
                <div class="space-y-2">
                  <FieldLabel :for="`gender-${draft.eventSeatId}`">
                    {{ $t('checkout.gender') }}
                  </FieldLabel>
                  <Select
                    v-model="draft.holder.gender"
                    :disabled="draft.source === TicketHolderSource.Account"
                  >
                    <SelectTrigger :id="`gender-${draft.eventSeatId}`">
                      <SelectValue :placeholder="$t('checkout.gender_placeholder')" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem :value="SavedAttendeeGender.Female">
                        {{ $t('checkout.gender_female') }}
                      </SelectItem>
                      <SelectItem :value="SavedAttendeeGender.Male">
                        {{ $t('checkout.gender_male') }}
                      </SelectItem>
                      <SelectItem :value="SavedAttendeeGender.NonBinary">
                        {{ $t('checkout.gender_non_binary') }}
                      </SelectItem>
                      <SelectItem :value="SavedAttendeeGender.PreferNotToSay">
                        {{ $t('checkout.gender_prefer_not') }}
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
                  />
                </div>
                <div class="space-y-2">
                  <FieldLabel :for="`preferred-${draft.eventSeatId}`">
                    {{ $t('checkout.preferred_name') }}
                  </FieldLabel>
                  <Input
                    :id="`preferred-${draft.eventSeatId}`"
                    v-model="draft.holder.preferredName"
                    :placeholder="$t('checkout.preferred_name')"
                  />
                </div>
                <div class="space-y-2 md:col-span-2">
                  <FieldLabel :for="`notes-${draft.eventSeatId}`">
                    {{ $t('checkout.notes') }}
                  </FieldLabel>
                  <Input
                    :id="`notes-${draft.eventSeatId}`"
                    v-model="draft.holder.notes"
                  />
                </div>
                <div class="space-y-2 md:col-span-2">
                  <FieldLabel :for="`access-${draft.eventSeatId}`">
                    {{ $t('checkout.accessibility_needs') }}
                  </FieldLabel>
                  <Input
                    :id="`access-${draft.eventSeatId}`"
                    v-model="draft.holder.accessibilityNeeds"
                  />
                </div>
              </div>

              <div
                v-if="isUnderEighteen(draft)"
                class="space-y-4 rounded-[1.25rem] border border-amber-500/20 bg-amber-500/5 p-4"
              >
                <p class="text-sm font-medium text-amber-200">
                  {{ $t('checkout.guardian_name') }}
                </p>

                <div class="grid gap-3 md:grid-cols-3">
                  <button
                    type="button"
                    :aria-pressed="draft.guardianSource === TicketHolderSource.Account"
                    :class="[
                      'inline-flex items-center justify-center gap-2 rounded-xl border px-3 py-2 text-sm font-medium transition',
                      draft.guardianSource === TicketHolderSource.Account ? 'border-primary/30 bg-primary/10 text-primary' : 'bg-muted/20 text-muted-foreground hover:text-foreground',
                    ]"
                    @click="setGuardianSource(draft, TicketHolderSource.Account)"
                  >
                    <UserRound class="size-4" />
                    {{ $t('checkout.use_buyer_details') }}
                  </button>
                  <button
                    type="button"
                    :aria-pressed="draft.guardianSource === TicketHolderSource.SavedAttendee"
                    :class="[
                      'inline-flex items-center justify-center gap-2 rounded-xl border px-3 py-2 text-sm font-medium transition',
                      draft.guardianSource === TicketHolderSource.SavedAttendee ? 'border-primary/30 bg-primary/10 text-primary' : 'bg-muted/20 text-muted-foreground hover:text-foreground',
                    ]"
                    @click="setGuardianSource(draft, TicketHolderSource.SavedAttendee)"
                  >
                    <UsersRound class="size-4" />
                    {{ $t('checkout.select_saved_attendee') }}
                  </button>
                  <button
                    type="button"
                    :aria-pressed="draft.guardianSource === TicketHolderSource.Manual"
                    :class="[
                      'inline-flex items-center justify-center gap-2 rounded-xl border px-3 py-2 text-sm font-medium transition',
                      draft.guardianSource === TicketHolderSource.Manual ? 'border-primary/30 bg-primary/10 text-primary' : 'bg-muted/20 text-muted-foreground hover:text-foreground',
                    ]"
                    @click="setGuardianSource(draft, TicketHolderSource.Manual)"
                  >
                    <PencilLine class="size-4" />
                    {{ $t('checkout.enter_manually') }}
                  </button>
                </div>

                <div
                  v-if="draft.guardianSource === TicketHolderSource.SavedAttendee"
                  class="space-y-2"
                >
                  <FieldLabel :for="`guardian-attendee-${draft.eventSeatId}`">
                    {{ $t('checkout.saved_attendee_label') }}
                  </FieldLabel>
                  <Select
                    :model-value="draft.guardianSavedAttendeeId ?? undefined"
                    @update:model-value="value => updateGuardianSavedAttendee(draft, typeof value === 'string' ? value : '')"
                  >
                    <SelectTrigger
                      :id="`guardian-attendee-${draft.eventSeatId}`"
                      class="w-full bg-background/60"
                    >
                      <SelectValue :placeholder="$t('checkout.attendee_placeholder')" />
                    </SelectTrigger>
                    <SelectContent
                      position="item-aligned"
                      class="max-w-[calc(100vw-2rem)]"
                    >
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

                <div class="grid gap-4 md:grid-cols-2">
                  <div class="space-y-2">
                    <FieldLabel :for="`guardian-name-${draft.eventSeatId}`">
                      {{ $t('checkout.guardian_name') }}
                    </FieldLabel>
                    <Input
                      :id="`guardian-name-${draft.eventSeatId}`"
                      :model-value="draft.holder.guardianName"
                      :readonly="draft.guardianSource !== TicketHolderSource.Manual"
                      @update:model-value="value => draft.guardianSource === TicketHolderSource.Manual && setManualGuardianField(draft, 'guardianName', typeof value === 'string' ? value : undefined)"
                    />
                  </div>
                  <div class="space-y-2">
                    <FieldLabel :for="`guardian-email-${draft.eventSeatId}`">
                      {{ $t('checkout.guardian_email') }}
                    </FieldLabel>
                    <Input
                      :id="`guardian-email-${draft.eventSeatId}`"
                      :model-value="draft.holder.guardianEmail"
                      type="email"
                      :readonly="draft.guardianSource !== TicketHolderSource.Manual"
                      @update:model-value="value => draft.guardianSource === TicketHolderSource.Manual && setManualGuardianField(draft, 'guardianEmail', typeof value === 'string' ? value : undefined)"
                    />
                  </div>
                  <div class="space-y-2 md:col-span-2">
                    <FieldLabel :for="`guardian-phone-${draft.eventSeatId}`">
                      {{ $t('checkout.guardian_phone') }}
                    </FieldLabel>
                    <Input
                      :id="`guardian-phone-${draft.eventSeatId}`"
                      :model-value="draft.holder.guardianPhone"
                      :readonly="draft.guardianSource !== TicketHolderSource.Manual"
                      @update:model-value="value => draft.guardianSource === TicketHolderSource.Manual && setManualGuardianField(draft, 'guardianPhone', typeof value === 'string' ? value : undefined)"
                    />
                  </div>
                </div>
              </div>
            </div>
          </article>

          <div class="space-y-4 pb-1">
            <div class="rounded-[1.5rem] border bg-background/80 p-4">
              <div class="mb-4">
                <p class="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                  {{ $t('checkout.billing_information') }}
                </p>
              </div>

              <FieldGroup>
                <div class="grid gap-3 md:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                  <VeeField
                    v-slot="{ field, errors }"
                    name="customerName"
                  >
                    <Field :data-invalid="!!errors.length">
                      <FieldLabel for="checkout-billing-name">
                        {{ $t('checkout.full_name') }}
                      </FieldLabel>
                      <Input
                        id="checkout-billing-name"
                        v-bind="field"
                        :placeholder="$t('checkout.full_name')"
                        :aria-invalid="!!errors.length"
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
                    :validate-on-input="true"
                  >
                    <Field :data-invalid="!!errors.length">
                      <FieldLabel for="checkout-billing-email">
                        {{ $t('checkout.email') }}
                      </FieldLabel>
                      <Input
                        id="checkout-billing-email"
                        v-bind="field"
                        type="email"
                        placeholder="you@example.com"
                        :aria-invalid="!!errors.length"
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
                    :validate-on-input="true"
                  >
                    <Field
                      class="md:col-span-2 lg:col-span-1 xl:col-span-2"
                      :data-invalid="!!errors.length"
                    >
                      <FieldLabel for="checkout-billing-phone">
                        {{ $t('checkout.phone') }}
                      </FieldLabel>
                      <Input
                        id="checkout-billing-phone"
                        v-bind="field"
                        type="tel"
                        placeholder="+84 90 000 0000"
                        :aria-invalid="!!errors.length"
                      />
                      <FieldError
                        v-if="errors.length"
                        :errors="errors"
                      />
                    </Field>
                  </VeeField>
                </div>
              </FieldGroup>
            </div>

            <div class="rounded-[1.5rem] border bg-background/80 p-4">
              <div class="mb-4">
                <p class="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                  {{ $t('checkout.payment_method') }}
                </p>
              </div>

              <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                <button
                  v-for="method in paymentMethodOptions"
                  :key="method.value"
                  type="button"
                  :aria-pressed="selectedPaymentMethod === method.value"
                  :class="[
                    'flex items-center gap-3 rounded-2xl border p-3 text-left transition',
                    selectedPaymentMethod === method.value ? 'border-primary/40 bg-primary/10 text-primary shadow-[0_12px_30px_-20px_hsl(var(--primary))]' : 'bg-muted/20 text-foreground hover:border-primary/30',
                  ]"
                  @click="selectedPaymentMethod = method.value"
                >
                  <span class="flex size-10 shrink-0 items-center justify-center rounded-xl border bg-background/80">
                    <CreditCard
                      v-if="method.value === OrderPaymentMethod.Visa || method.value === OrderPaymentMethod.Mastercard"
                      class="size-4"
                    />
                    <WalletCards
                      v-else-if="method.value === OrderPaymentMethod.Paypal"
                      class="size-4"
                    />
                    <Landmark
                      v-else
                      class="size-4"
                    />
                  </span>
                  <span class="min-w-0">
                    <span class="block text-sm font-semibold">{{ method.label }}</span>
                    <span class="block truncate text-xs text-muted-foreground">{{ method.description }}</span>
                  </span>
                </button>
              </div>
            </div>
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

      <Card
        v-if="checkout.order.status === OrderStatus.Confirmed"
        class="overflow-hidden"
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

          <div
            v-if="checkout.order.payment"
            class="rounded-[1.5rem] border border-white/10 bg-black/25 p-5"
          >
            <p class="text-sm text-white/55">
              {{ $t('checkout.payment_method') }}
            </p>
            <p class="mt-2 text-lg font-semibold text-white">
              {{ getPaymentMethodLabel(checkout.order.payment) }}
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
        class="flex flex-col lg:sticky lg:top-4 lg:h-[calc(100dvh-2rem)] lg:overflow-hidden"
      >
        <CardContent class="flex min-h-0 flex-1 flex-col p-0">
          <ScrollArea class="min-h-0 flex-1 px-4 py-4 md:px-5">
            <ItemGroup class="gap-2.5 p-4">
              <Item
                v-for="section in checkoutSectionSummaries"
                :key="section.sectionLabel"
                variant="outline"
                class="bg-background/60"
              >
                <ItemContent class="min-w-0 gap-1">
                  <ItemTitle>x{{ section.quantity }} {{ section.sectionLabel }}</ItemTitle>
                  <ItemDescription>
                    <span>
                      {{ $t('checkout.section_subtotal') }} · {{ formatCurrency(section.subtotalCents) }}
                    </span>

                    <div
                      v-if="section.customSeats.length > 0"
                      class="mt-2 flex flex-col gap-1.5"
                    >
                      <div
                        v-for="seat in section.customSeats"
                        :key="seat.id"
                        class="flex items-start justify-between gap-3 rounded-lg bg-muted/45 px-3 py-2"
                      >
                        <div class="min-w-0">
                          <p class="truncate text-xs font-medium text-foreground">
                            {{ seat.seatLabel }}
                          </p>
                          <p class="mt-0.5 truncate text-xs text-muted-foreground">
                            {{ formatSeatLocation([getCheckoutSectionLabel(seat.sectionLabel), seat.rowLabel]) }}
                          </p>
                        </div>
                        <p class="shrink-0 font-mono text-xs font-semibold text-foreground">
                          {{ formatCurrency(seat.unitPriceCents) }}
                        </p>
                      </div>
                    </div>
                  </ItemDescription>
                </ItemContent>

                <ItemActions class="shrink-0 justify-end">
                  <div class="text-right">
                    <p class="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                      {{ $t('checkout.section_subtotal') }}
                    </p>
                    <p class="mt-1 font-mono text-sm font-semibold text-foreground">
                      {{ formatCurrency(section.subtotalCents) }}
                    </p>
                  </div>
                </ItemActions>
              </Item>
            </ItemGroup>
          </ScrollArea>

          <CardFooter
            v-if="checkout.order.status !== OrderStatus.Confirmed"
            class="flex shrink-0 flex-col gap-3 border-t bg-background/95 px-4 pb-4 pt-3 md:px-5"
          >
            <div class="w-full rounded-[1.5rem] bg-muted/50 px-5 py-4">
              <p class="text-sm text-muted-foreground">
                {{ $t('checkout.order_total') }}
              </p>
              <p class="mt-2 text-3xl font-semibold tracking-[-0.05em]">
                {{ formatCurrency(checkout.order.amountCents) }}
              </p>
            </div>

            <div class="grid w-full gap-2 sm:grid-cols-2">
              <Button
                type="submit"
                form="checkout-information-form"
                class="w-full rounded-full shadow-[0_10px_30px_-10px_hsl(var(--primary)/0.75)]"
                size="lg"
                :is-loading="isSubmitting"
                :disabled="isHoldExpired || isCancelling || !selectedPaymentMethod"
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
          </CardFooter>
        </CardContent>
      </Card>
    </section>
  </main>
</template>
