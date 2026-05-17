<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { Field as VeeField, useForm } from 'vee-validate'
import { motion } from 'motion-v'
import { toast } from 'vue-sonner'
import { Check, Circle, Cloud, CloudAlert, Dot, Loader2, MapPin, Search, SearchX, Users } from '@lucide/vue'
import { ImageUploadKind } from '#shared/constants/imageUpload'
import ImageUpload from '@/components/ui/image-upload/ImageUpload.vue'
import { apiRequest } from '@/utils/apiRequest'
import { parseApiError } from '@/utils/apiError'
import { getDisplayDateLocale } from '@/lib/localizedEvents'
import { formatDateTime, formatTime } from '@/lib/utils'
import { filterVenuePickerOptions, getVenuePageCount, getVenuePageItems } from '@/lib/venuePicker'
import { apiRoutes } from '#shared/apiRoutes'
import { eventComposerSchema, getEventSessionTimingIssues } from '#shared/schemas/ticketingSchema'
import type { Venue } from '#shared/db'
import type { VenuePickerOption } from '@/lib/venuePicker'
import type { EventAutosaveDraftInput, EventComposerInput } from '#shared/schemas/ticketingSchema'
import type { ApiResponse } from '~~/types/api'
import type { AutosaveDraftDeleteData, AutosaveDraftDetail } from '~~/types/admin-events'
import type { SeatMapSeat } from '~~/types/seatmap'
import type { VenueDetail, VenueDetailSection } from '~~/types/venues'
import { EventStatus, PricingMode } from '#shared/commonEnums'
import { createVenueSeatMapPreviewSeats } from '@/lib/venueSeatMapPreview'

const { locale, t } = useI18n()
const VENUE_PAGE_SIZE = 6

definePageMeta({
  title: 'admin.event_create.page_title',
  breadcrumb: 'admin.event_create.breadcrumb',
  middleware: ['auth', 'admin'],
  layout: 'dashboard',
})

useSeo({
  title: computed(() => t('admin.event_create.page_title')),
  description: computed(() => t('admin.event_create.step_review_desc')),
  type: 'website',
})

const displayLocale = computed(() => getDisplayDateLocale(locale.value))

interface EventCreationStep {
  step: number
  title: string
  description: string
}

const steps = computed<EventCreationStep[]>(() => [
  { step: 1, title: t('admin.event_create.step_basics'), description: t('admin.event_create.step_basics_desc') },
  { step: 2, title: t('admin.event_create.step_venue'), description: t('admin.event_create.step_venue_desc') },
  { step: 3, title: t('admin.event_create.step_sessions'), description: t('admin.event_create.step_sessions_desc') },
  { step: 4, title: t('admin.event_create.step_review'), description: t('admin.event_create.step_review_desc') },
])

const stepSchemas = {
  1: eventComposerSchema.pick({
    title: true,
    slug: true,
    subtitle: true,
    description: true,
    coverImage: true,
  }),
  2: eventComposerSchema.pick({
    venueId: true,
  }),
  3: eventComposerSchema.pick({
    sessions: true,
  }),
}

const { data: venuesResponse } = await useAPI<ApiResponse<Venue[]>>(() => apiRoutes.ADMIN_VENUES)
const venues = computed<VenuePickerOption[]>(() => venuesResponse.value?.data ?? [])
const venueSearch = ref('')
const venuePage = ref(1)
const filteredVenues = computed(() => filterVenuePickerOptions(venues.value, venueSearch.value))
const venuePageCount = computed(() => getVenuePageCount(filteredVenues.value.length, VENUE_PAGE_SIZE))
const paginatedVenues = computed(() => getVenuePageItems(filteredVenues.value, venuePage.value, VENUE_PAGE_SIZE))
const selectedVenueDetail = ref<VenueDetail | null>(null)
const isLoadingVenueDetail = ref(false)
const currentStep = ref(1)
const highestReachedStep = ref(1)
const isSaving = ref(false)
const sessionValidationErrors = ref<Record<string, string>>({})
const autosaveDraftKey = ref('')
const autosaveStatus = ref<'idle' | 'saving' | 'saved' | 'error'>('idle')
const lastAutosavedAt = ref<Date | null>(null)
const lastAutosaveSignature = ref('')
const autosaveDisabled = ref(false)
const pendingAutosaveDraft = ref<AutosaveDraftDetail | null>(null)
const isLoadingAutosaveDraft = ref(false)
const isCheckingAutosaveDraft = ref(false)
const isAutosaveRestoreDialogOpen = ref(false)
const isAutosaveInFlight = ref(false)
const hasQueuedAutosave = ref(false)
let autosaveRequestId = 0
let autosaveTimerId: number | null = null
let venueLoadRequestId = 0
const autosaveIdleResolvers: Array<() => void> = []

const defaultValues: EventComposerInput = {
  slug: '',
  title: '',
  subtitle: '',
  description: '',
  venueId: 0,
  coverImage: '',
  sessions: [],
}

const {
  handleSubmit,
  resetForm,
  setFieldError,
  setFieldValue,
  values,
} = useForm({
  initialValues: { ...defaultValues },
  validationSchema: eventComposerSchema,
  keepValuesOnUnmount: true,
})

const selectedVenue = computed(() => venues.value.find(venue => venue.id === values.venueId) ?? null)
const canContinueFromVenueStep = computed(() => Boolean(
  values.venueId
  && selectedVenueDetail.value?.venue.id === values.venueId
  && !isLoadingVenueDetail.value,
))

const hasAutosavableContent = computed(() => {
  return Boolean(
    values.title?.trim()
    || values.slug?.trim()
    || values.subtitle?.trim()
    || values.description?.trim()
    || values.coverImage?.trim()
    || values.venueId
    || (values.sessions?.length ?? 0) > 0,
  )
})

const autosaveLabel = computed(() => {
  if (autosaveStatus.value === 'saving') {
    return t('admin.event_create.saving_draft')
  }

  if (autosaveStatus.value === 'saved') {
    return lastAutosavedAt.value
      ? t('admin.event_create.draft_saved_at', { time: formatTime(lastAutosavedAt.value, displayLocale.value) })
      : t('admin.event_create.draft_saved_generic')
  }

  if (autosaveStatus.value === 'error') {
    return t('admin.event_create.autosave_failed')
  }

  return ''
})

const autosaveIcon = computed(() => {
  if (autosaveStatus.value === 'saving') {
    return Loader2
  }

  if (autosaveStatus.value === 'error') {
    return CloudAlert
  }

  return Cloud
})

function buildAutosavePayload() {
  return {
    slug: values.slug,
    title: values.title,
    subtitle: values.subtitle,
    description: values.description,
    venueId: values.venueId,
    coverImage: values.coverImage,
    sessions: (values.sessions ?? []).map(session => ({
      label: session.label,
      venueId: session.venueId,
      status: session.status,
      queueEnabled: session.queueEnabled,
      startsAt: session.startsAt,
      endsAt: session.endsAt,
      salesStartAt: session.salesStartAt,
      salesEndAt: session.salesEndAt,
      pricingMode: session.pricingMode,
      currency: session.currency,
      sectionPrices: session.sectionPrices.map(sectionPrice => ({
        venueSectionId: sectionPrice.venueSectionId,
        priceCents: sectionPrice.priceCents,
        currency: sectionPrice.currency,
        sortOrder: sectionPrice.sortOrder,
      })),
      seatOverrides: session.seatOverrides.map(seatOverride => ({
        venueSeatId: seatOverride.venueSeatId,
        venueSectionId: seatOverride.venueSectionId,
        priceCents: seatOverride.priceCents,
        currency: seatOverride.currency,
        isDisabled: seatOverride.isDisabled,
      })),
    })),
  }
}

function buildSectionPricesFromVenueSections(sections: VenueDetailSection[], currency = 'VND'): EventComposerInput['sessions'][number]['sectionPrices'] {
  return sections.map((section, sectionIndex) => ({
    venueSectionId: section.id,
    priceCents: 0,
    currency,
    sortOrder: sectionIndex,
  }))
}

function buildDefaultSessionForVenue(venueId: number, sections: VenueDetailSection[]): EventComposerInput['sessions'][number] {
  return {
    label: 'Default session',
    venueId,
    status: EventStatus.Draft,
    queueEnabled: false,
    startsAt: '',
    endsAt: '',
    salesStartAt: '',
    salesEndAt: '',
    pricingMode: PricingMode.Uniform,
    currency: 'VND',
    sectionPrices: buildSectionPricesFromVenueSections(sections),
    seatOverrides: [],
  }
}

function rebuildSessionsForVenue(venueId: number, sections: VenueDetailSection[]): EventComposerInput['sessions'] {
  const sessions = values.sessions ?? []
  if (!sessions.length) {
    return [buildDefaultSessionForVenue(venueId, sections)]
  }

  return sessions.map(session => ({
    ...session,
    venueId,
    sectionPrices: buildSectionPricesFromVenueSections(sections, session.currency || 'VND'),
    seatOverrides: [],
  }))
}

function normalizeAutosavePayload(payload: EventAutosaveDraftInput['payload']) {
  const values: EventComposerInput = {
    slug: payload.slug ?? '',
    title: payload.title ?? '',
    subtitle: payload.subtitle ?? '',
    description: payload.description ?? '',
    venueId: payload.venueId ?? 0,
    coverImage: payload.coverImage ?? '',
    sessions: (payload.sessions ?? []).map((session, sessionIndex) => ({
      label: session.label ?? `Session ${sessionIndex + 1}`,
      venueId: session.venueId ?? payload.venueId ?? 0,
      status: session.status ?? EventStatus.Draft,
      queueEnabled: session.queueEnabled ?? false,
      startsAt: session.startsAt ?? '',
      endsAt: session.endsAt ?? '',
      salesStartAt: session.salesStartAt ?? '',
      salesEndAt: session.salesEndAt ?? '',
      pricingMode: session.pricingMode ?? PricingMode.Uniform,
      currency: session.currency ?? 'VND',
      sectionPrices: (session.sectionPrices ?? []).map((sectionPrice, sectionIndex) => ({
        venueSectionId: sectionPrice.venueSectionId,
        priceCents: sectionPrice.priceCents,
        currency: sectionPrice.currency ?? session.currency ?? 'VND',
        sortOrder: sectionPrice.sortOrder ?? sectionIndex,
      })),
      seatOverrides: (session.seatOverrides ?? []).map(seatOverride => ({
        venueSeatId: seatOverride.venueSeatId,
        venueSectionId: seatOverride.venueSectionId,
        priceCents: seatOverride.priceCents ?? null,
        currency: seatOverride.currency ?? null,
        isDisabled: seatOverride.isDisabled ?? false,
      })),
    })),
  }

  return values
}

async function loadAutosaveDraft(draftKey: string, restoreImmediately: boolean) {
  isLoadingAutosaveDraft.value = true
  try {
    const response = await apiRequest<ApiResponse<AutosaveDraftDetail>>(apiRoutes.adminEventAutosave(draftKey))
    if (!response.success) {
      throw response
    }

    pendingAutosaveDraft.value = response.data
    if (restoreImmediately) {
      restoreAutosaveDraft()
      return true
    }

    isAutosaveRestoreDialogOpen.value = true
    return true
  }
  catch (error) {
    toast.error(parseApiError(error, t('admin.event_create.autosave_load_error')).message)
    return false
  }
  finally {
    isLoadingAutosaveDraft.value = false
  }
}

async function loadCurrentAutosaveDraftPrompt() {
  isCheckingAutosaveDraft.value = true
  try {
    const response = await apiRequest(apiRoutes.ADMIN_EVENT_AUTOSAVES)
    if (!response.success) {
      throw response
    }

    if (response.data?.draftKey) {
      await loadAutosaveDraft(response.data.draftKey, false)
    }
  }
  catch (error) {
    toast.error(parseApiError(error, t('admin.event_create.autosave_check_error')).message)
  }
  finally {
    isCheckingAutosaveDraft.value = false
  }
}

function restoreAutosaveDraft() {
  const draft = pendingAutosaveDraft.value
  if (!draft) {
    return
  }

  resetForm({ values: normalizeAutosavePayload(draft.payload) })
  autosaveDraftKey.value = draft.draftKey
  currentStep.value = Math.min(Math.max(draft.lastSavedStep, 1), steps.value.length)
  highestReachedStep.value = Math.max(currentStep.value, 1)
  pendingAutosaveDraft.value = null
  isAutosaveRestoreDialogOpen.value = false
  lastAutosaveSignature.value = ''
  if (import.meta.client) {
    window.localStorage.setItem('ticketrush:event-create-autosave-key', draft.draftKey)
  }
  toast.success(t('admin.event_create.autosave_restored'))
}

function startFreshFromAutosaveDraft() {
  pendingAutosaveDraft.value = null
  isAutosaveRestoreDialogOpen.value = false
  autosaveDraftKey.value = ''
  lastAutosaveSignature.value = ''
  if (import.meta.client) {
    window.localStorage.removeItem('ticketrush:event-create-autosave-key')
  }
}

async function _discardAutosaveDraft() {
  const draft = pendingAutosaveDraft.value
  if (!draft) {
    return
  }

  try {
    const response = await apiRequest<ApiResponse<AutosaveDraftDeleteData>>(apiRoutes.adminEventAutosave(draft.draftKey), { method: 'DELETE' })
    if (!response.success) {
      throw response
    }
    if (import.meta.client) {
      window.localStorage.removeItem('ticketrush:event-create-autosave-key')
    }
    if (autosaveDraftKey.value === draft.draftKey) {
      autosaveDraftKey.value = ''
    }
    pendingAutosaveDraft.value = null
    isAutosaveRestoreDialogOpen.value = false
    toast.success(t('admin.events.autosave_discarded'))
  }
  catch (error) {
    toast.error(parseApiError(error, t('admin.events.discard_failed')).message)
  }
}

function resolveAutosaveIdleWaiters() {
  while (autosaveIdleResolvers.length > 0) {
    const resolve = autosaveIdleResolvers.shift()
    if (resolve) {
      resolve()
    }
  }
}

function waitForAutosaveIdle() {
  if (!isAutosaveInFlight.value) {
    return Promise.resolve()
  }

  return new Promise<void>((resolve) => {
    autosaveIdleResolvers.push(resolve)
  })
}

async function saveAutosaveDraft() {
  if (autosaveDisabled.value || pendingAutosaveDraft.value || isLoadingAutosaveDraft.value || isCheckingAutosaveDraft.value || !hasAutosavableContent.value) {
    return
  }

  if (isAutosaveInFlight.value) {
    hasQueuedAutosave.value = true
    return
  }

  const payload = buildAutosavePayload()
  const signature = JSON.stringify({ payload, currentStep: currentStep.value })
  if (signature === lastAutosaveSignature.value) {
    return
  }

  autosaveStatus.value = 'saving'
  isAutosaveInFlight.value = true
  const requestId = autosaveRequestId + 1
  autosaveRequestId = requestId

  try {
    const response = await apiRequest(apiRoutes.ADMIN_EVENT_AUTOSAVE, {
      method: 'POST',
      body: {
        draftKey: autosaveDraftKey.value || undefined,
        lastSavedStep: currentStep.value,
        payload,
      },
    })
    if (!response.success) {
      throw response
    }

    autosaveDraftKey.value = response.data.draftKey

    if (autosaveDisabled.value || requestId !== autosaveRequestId) {
      return
    }

    lastAutosavedAt.value = response.data.updatedAt ? new Date(response.data.updatedAt) : new Date()
    lastAutosaveSignature.value = signature
    autosaveStatus.value = 'saved'

    if (import.meta.client) {
      window.localStorage.setItem('ticketrush:event-create-autosave-key', response.data.draftKey)
    }
  }
  catch {
    if (autosaveDisabled.value || requestId !== autosaveRequestId) {
      return
    }

    autosaveStatus.value = 'error'
  }
  finally {
    isAutosaveInFlight.value = false
    if (hasQueuedAutosave.value && !autosaveDisabled.value) {
      hasQueuedAutosave.value = false
      void saveAutosaveDraft()
      return
    }

    resolveAutosaveIdleWaiters()
  }
}

function queueAutosave(delay = 900) {
  if (!import.meta.client || autosaveDisabled.value || pendingAutosaveDraft.value || isLoadingAutosaveDraft.value || isCheckingAutosaveDraft.value || !hasAutosavableContent.value) {
    return
  }

  if (autosaveTimerId !== null) {
    window.clearTimeout(autosaveTimerId)
  }

  autosaveTimerId = window.setTimeout(() => {
    autosaveTimerId = null
    void saveAutosaveDraft()
  }, delay)
}

function goToPreviousVenuePage() {
  venuePage.value = Math.max(venuePage.value - 1, 1)
}

function goToNextVenuePage() {
  venuePage.value = Math.min(venuePage.value + 1, venuePageCount.value)
}

watch(venueSearch, () => {
  venuePage.value = 1
})

watch(venuePageCount, (pageCount) => {
  if (venuePage.value > pageCount) {
    venuePage.value = pageCount
  }
})

watch(() => values.venueId, async (venueId) => {
  venueLoadRequestId += 1
  const requestId = venueLoadRequestId
  const previousVenueId = selectedVenueDetail.value?.venue.id
  selectedVenueDetail.value = null

  if (!venueId) {
    isLoadingVenueDetail.value = false
    return
  }

  isLoadingVenueDetail.value = true

  try {
    const detail = await apiRequest<ApiResponse<VenueDetail>>(apiRoutes.adminVenue(venueId))
    if (requestId !== venueLoadRequestId) {
      return
    }

    if (!detail.success) {
      toast.error(parseApiError(detail).message)
      selectedVenueDetail.value = null
      return
    }

    selectedVenueDetail.value = detail.data

    const sessions = values.sessions ?? []
    const shouldRebuildSessions = !sessions.length
      || sessions.some(session => session.venueId !== venueId)
      || (previousVenueId !== undefined && previousVenueId !== venueId)

    if (shouldRebuildSessions) {
      setFieldValue('sessions', rebuildSessionsForVenue(venueId, detail.data.sections))
      if (Object.keys(sessionValidationErrors.value).length) {
        clearSessionValidationErrors()
        sessionValidationErrors.value = buildSessionValidationErrors()
      }
    }
  }
  catch (error) {
    if (requestId === venueLoadRequestId) {
      toast.error(parseApiError(error).message)
      selectedVenueDetail.value = null
    }
  }
  finally {
    if (requestId === venueLoadRequestId) {
      isLoadingVenueDetail.value = false
    }
  }
})

const previewSeats = computed<SeatMapSeat[]>(() => {
  if (!selectedVenueDetail.value) {
    return []
  }

  const firstSession = values.sessions?.[0]
  const sectionPriceBySectionId = new Map(firstSession?.sectionPrices.map(sectionPrice => [sectionPrice.venueSectionId, sectionPrice]) ?? [])

  return createVenueSeatMapPreviewSeats(selectedVenueDetail.value.sections).map((seat) => {
    const sectionPrice = typeof seat.venueSectionId === 'number'
      ? sectionPriceBySectionId.get(seat.venueSectionId)
      : undefined

    return {
      ...seat,
      priceCents: sectionPrice?.priceCents ?? 0,
      currency: sectionPrice?.currency ?? firstSession?.currency ?? 'VND',
    }
  })
})

const totalRows = computed(() => selectedVenueDetail.value?.sections.reduce((count, section) => count + section.rows.length, 0) ?? 0)
const totalSeats = computed(() => selectedVenueDetail.value?.sections.reduce((sectionCount, section) => sectionCount + section.rows.reduce((rowCount, row) => rowCount + row.seats.length, 0), 0) ?? 0)

function getSessionFieldPath(sessionIndex: number, fieldName: string) {
  return `sessions.${sessionIndex}.${fieldName}`
}

function getSectionPriceFieldPath(sessionIndex: number, sectionIndex: number, fieldName: string) {
  return `sessions.${sessionIndex}.sectionPrices.${sectionIndex}.${fieldName}`
}

function addSessionValidationError(errors: Record<string, string>, path: string, message: string) {
  errors[path] = message
  setFieldError(path, message)
}

function buildSessionValidationErrors(sessions = values.sessions ?? []) {
  const errors: Record<string, string> = {}

  if (!sessions.length) {
    addSessionValidationError(errors, 'sessions', t('admin.event_create.session_required'))
    return errors
  }

  sessions.forEach((session, sessionIndex) => {
    const sessionLabel = session.label?.trim() || t('admin.event_create.session_number', { number: sessionIndex + 1 })

    if (!session.label?.trim()) {
      addSessionValidationError(errors, getSessionFieldPath(sessionIndex, 'label'), t('admin.event_create.session_label_required', { session: sessionLabel }))
    }

    for (const issue of getEventSessionTimingIssues(session, sessionLabel)) {
      addSessionValidationError(errors, getSessionFieldPath(sessionIndex, issue.field), translateSessionTimingIssue(issue.field, sessionLabel))
    }

    if (!session.sectionPrices.length) {
      addSessionValidationError(errors, getSessionFieldPath(sessionIndex, 'sectionPrices'), t('admin.event_create.section_pricing_required', { session: sessionLabel }))
    }

    session.sectionPrices.forEach((sectionPrice, sectionIndex) => {
      const sectionLabel = t('admin.event_create.session_section_label', { session: sessionLabel, number: sectionIndex + 1 })

      if (sectionPrice.priceCents < 0) {
        addSessionValidationError(errors, getSectionPriceFieldPath(sessionIndex, sectionIndex, 'priceCents'), t('admin.event_create.price_negative', { section: sectionLabel }))
      }
    })
  })

  return errors
}

function showSessionValidationToast(errors: Record<string, string>) {
  const messages = Object.values(errors)
  const firstMessages = messages.slice(0, 4)
  const remainingCount = Math.max(messages.length - firstMessages.length, 0)
  const suffix = remainingCount ? t('admin.event_create.more_errors_suffix', { count: remainingCount }) : ''
  toast.error(t('admin.event_create.fix_sessions', { messages: firstMessages.join('; '), suffix }))
}

function translateSessionTimingIssue(field: string, session: string) {
  const keys: Record<string, string> = {
    startsAt: 'admin.event_create.session_start_invalid',
    endsAt: 'admin.event_create.session_end_invalid',
    salesStartAt: 'admin.event_create.sales_start_invalid',
    salesEndAt: 'admin.event_create.sales_end_invalid',
  }

  return t(keys[field] ?? 'admin.event_create.session_timing_invalid', { session })
}

function translateStepIssue(field: string, fallback: string) {
  const keys: Record<string, string> = {
    title: 'admin.event_create.title_required',
    slug: 'admin.event_create.slug_required',
    description: 'admin.event_create.description_required',
    venueId: 'admin.event_create.venue_required',
  }

  return keys[field] ? t(keys[field]) : fallback
}

function clearSessionValidationErrors() {
  for (const path of Object.keys(sessionValidationErrors.value)) {
    setFieldError(path, '')
  }
}

function validateSessionsStep(showToast = true) {
  clearSessionValidationErrors()
  const errors = buildSessionValidationErrors()
  sessionValidationErrors.value = errors

  if (Object.keys(errors).length) {
    if (showToast) {
      showSessionValidationToast(errors)
    }
    return false
  }

  return true
}

function updateSessions(sessions: EventComposerInput['sessions']) {
  setFieldValue('sessions', sessions)
  if (Object.keys(sessionValidationErrors.value).length) {
    clearSessionValidationErrors()
    sessionValidationErrors.value = buildSessionValidationErrors(sessions)
  }
}

function getStepSchema(step: number) {
  switch (step) {
    case 1:
      return stepSchemas[1]
    case 2:
      return stepSchemas[2]
    case 3:
      return stepSchemas[3]
    default:
      return eventComposerSchema
  }
}

function applyStepErrors(step: number) {
  if (step === 3) {
    return validateSessionsStep()
  }

  const schema = getStepSchema(step)
  const result = schema.safeParse(values)
  if (result.success) {
    if (step === 2 && !canContinueFromVenueStep.value) {
      toast.error(t('admin.event_create.choose_venue_prompt'))
      return false
    }

    return true
  }

  const messages: string[] = []
  for (const issue of result.error.issues) {
    const pathPart = issue.path[0]
    if (typeof pathPart === 'string') {
      const message = translateStepIssue(pathPart, issue.message)
      setFieldError(pathPart, message)
      messages.push(message)
    }
  }

  const firstMessage = messages[0]
  if (firstMessage) {
    toast.error(firstMessage)
  }
  return false
}

function canReachStep(step: number) {
  return step <= highestReachedStep.value || step === currentStep.value + 1
}

function validateUntilStep(step: number) {
  for (let stepIndex = currentStep.value; stepIndex < step; stepIndex += 1) {
    if (!applyStepErrors(stepIndex)) {
      return false
    }
  }

  return true
}

function handleStepUpdate(step: number | string) {
  const nextStep = typeof step === 'number' ? step : Number(step)
  if (Number.isInteger(nextStep)) {
    goToStep(nextStep)
  }
}

function goToStep(step: number) {
  if (step === currentStep.value) {
    return
  }

  if (step < currentStep.value) {
    currentStep.value = step
    return
  }

  if (!canReachStep(step)) {
    toast.error(t('admin.event_create.jump_error'))
    return
  }

  if (validateUntilStep(step)) {
    void saveAutosaveDraft()
    currentStep.value = step
    highestReachedStep.value = Math.max(highestReachedStep.value, step)
  }
}

function goNext() {
  if (currentStep.value >= steps.value.length) {
    return
  }

  goToStep(currentStep.value + 1)
}

function goPrevious() {
  if (currentStep.value <= 1) {
    return
  }

  currentStep.value -= 1
}

const onSubmit = handleSubmit(
  async (formValues) => {
    if (!validateSessionsStep()) {
      currentStep.value = 3
      return
    }

    isSaving.value = true
    autosaveDisabled.value = true
    autosaveRequestId += 1
    if (autosaveTimerId !== null) {
      window.clearTimeout(autosaveTimerId)
      autosaveTimerId = null
    }

    await waitForAutosaveIdle()

    try {
      const response = await apiRequest(apiRoutes.ADMIN_EVENTS, {
        method: 'POST',
        body: {
          slug: formValues.slug,
          title: formValues.title,
          subtitle: formValues.subtitle,
          description: formValues.description,
          venueId: formValues.venueId,
          coverImage: formValues.coverImage,
          sessions: formValues.sessions.map(session => ({
            label: session.label,
            venueId: session.venueId,
            status: session.status,
            pricingMode: session.pricingMode,
            currency: session.currency,
            queueEnabled: session.queueEnabled,
            startsAt: new Date(session.startsAt),
            endsAt: session.endsAt ? new Date(session.endsAt) : undefined,
            salesStartAt: new Date(session.salesStartAt),
            salesEndAt: new Date(session.salesEndAt),
            sectionPrices: session.sectionPrices.map((sectionPrice, sectionIndex) => ({
              venueSectionId: sectionPrice.venueSectionId,
              priceCents: sectionPrice.priceCents,
              currency: sectionPrice.currency || session.currency,
              sortOrder: sectionIndex,
            })),
            seatOverrides: session.seatOverrides,
          })),
        },
      })

      if (!response.success) {
        throw response
      }

      if (autosaveDraftKey.value) {
        try {
          const discardResponse = await apiRequest<ApiResponse<AutosaveDraftDeleteData>>(apiRoutes.adminEventAutosave(autosaveDraftKey.value), {
            method: 'DELETE',
          })
          if (!discardResponse.success) {
            throw discardResponse
          }
        }
        catch (error) {
          toast.warning(parseApiError(error, t('admin.event_create.autosave_convert_warning')).message)
        }
      }

      toast.success(t('admin.events.draft_saved'))
      if (import.meta.client && autosaveDraftKey.value) {
        window.localStorage.removeItem('ticketrush:event-create-autosave-key')
      }
      autosaveDraftKey.value = ''
      lastAutosaveSignature.value = ''
      resetForm({ values: { ...defaultValues } })
      selectedVenueDetail.value = null
      currentStep.value = 1
      highestReachedStep.value = 1
      await navigateTo(`/admin/events/${response.data.id}`)
    }
    catch (error) {
      autosaveDisabled.value = false
      toast.error(parseApiError(error, t('admin.event_create.save_error')).message)
    }
    finally {
      isSaving.value = false
    }
  },
  ({ errors }) => {
    if (Object.keys(errors).some(path => path.startsWith('sessions'))) {
      currentStep.value = 3
      if (!validateSessionsStep()) {
        return
      }
    }

    const firstError = Object.values(errors).flat().filter(Boolean)[0] || 'admin.event_create.fix_fields'
    toast.error(t(firstError))
  },
)

watch(values, () => {
  queueAutosave()
}, { deep: true })

onMounted(() => {
  void (async () => {
    const route = useRoute()
    const draftKeyQuery = typeof route.query.draftKey === 'string' ? route.query.draftKey : ''
    if (draftKeyQuery) {
      await loadAutosaveDraft(draftKeyQuery, true)
      return
    }

    const localDraftKey = window.localStorage.getItem('ticketrush:event-create-autosave-key') || ''
    if (localDraftKey) {
      const loaded = await loadAutosaveDraft(localDraftKey, false)
      if (loaded) {
        return
      }

      window.localStorage.removeItem('ticketrush:event-create-autosave-key')
    }

    await loadCurrentAutosaveDraftPrompt()
  })()
})

onUnmounted(() => {
  if (autosaveTimerId !== null) {
    window.clearTimeout(autosaveTimerId)
  }
})
</script>

<template>
  <div class="space-y-6">
    <AlertDialog v-model:open="isAutosaveRestoreDialogOpen">
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{{ $t('admin.event_create.restore_dialog_title') }}</AlertDialogTitle>
          <AlertDialogDescription>
            {{ $t('admin.event_create.restore_dialog_desc', { title: pendingAutosaveDraft?.payload.title || $t('admin.events.untitled_event'), step: pendingAutosaveDraft?.lastSavedStep ?? 1, date: pendingAutosaveDraft?.updatedAt ? $t('admin.event_create.restore_dialog_date', { date: formatDateTime(pendingAutosaveDraft.updatedAt, displayLocale) }) : '' }) }}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel @click="startFreshFromAutosaveDraft">
            {{ $t('admin.event_create.start_fresh') }}
          </AlertDialogCancel>
          <AlertDialogAction @click="restoreAutosaveDraft">
            {{ $t('admin.event_create.restore_draft') }}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>

    <Card
      v-if="isLoadingAutosaveDraft"
      class="shadow-none"
    >
      <CardContent class="flex items-center gap-3 py-4 text-sm text-muted-foreground">
        <Loader2 class="size-4 animate-spin" />
        {{ $t('admin.event_create.loading_draft') }}
      </CardContent>
    </Card>

    <Stepper
      :model-value="currentStep"
      class="flex w-full items-start gap-2"
      linear
      @update:model-value="handleStepUpdate"
    >
      <StepperItem
        v-for="step in steps"
        :key="step.step"
        v-slot="{ state }"
        :step="step.step"
        :disabled="step.step > highestReachedStep && step.step !== currentStep + 1"
        class="relative flex w-full flex-col items-center justify-center"
      >
        <StepperSeparator
          v-if="step.step !== steps[steps.length - 1]?.step"
          class="absolute left-[calc(50%+20px)] right-[calc(-50%+10px)] top-5 block h-0.5 shrink-0 rounded-full bg-muted group-data-[state=completed]:bg-primary"
        />

        <StepperTrigger as-child>
          <Button
            :variant="state === 'completed' || state === 'active' ? 'default' : 'outline'"
            size="icon"
            class="z-10 shrink-0 rounded-full"
            :class="[state === 'active' && 'ring-2 ring-ring ring-offset-2 ring-offset-background']"
          >
            <Check
              v-if="state === 'completed'"
              class="size-5"
            />
            <Circle v-if="state === 'active'" />
            <Dot v-if="state === 'inactive'" />
          </Button>
        </StepperTrigger>

        <div class="mt-5 flex flex-col items-center text-center">
          <StepperTitle
            :class="[state === 'active' && 'text-primary']"
            class="text-sm font-semibold transition lg:text-base"
          >
            {{ step.title }}
          </StepperTitle>
          <StepperDescription
            :class="[state === 'active' && 'text-primary']"
            class="sr-only text-xs text-muted-foreground transition md:not-sr-only lg:text-sm"
          >
            {{ step.description }}
          </StepperDescription>
        </div>
      </StepperItem>
    </Stepper>

    <form
      class="space-y-6 pb-44 sm:pb-32 md:pb-28"
      @submit.prevent="onSubmit"
    >
      <motion.div
        :key="currentStep"
        :initial="{ opacity: 0, y: 12 }"
        :animate="{ opacity: 1, y: 0 }"
        :transition="{ duration: 0.22, ease: 'easeOut' }"
      >
        <div
          v-show="currentStep === 1"
          class="mx-auto grid max-w-6xl gap-5 xl:grid-cols-[minmax(0,42rem)_minmax(20rem,1fr)]"
        >
          <Card class="rounded-3xl shadow-sm">
            <CardContent>
              <FieldSet>
                <FieldLegend>{{ $t('admin.event_create.event_basics') }}</FieldLegend>
                <FieldGroup>
                  <VeeField
                    v-slot="{ field, errors }"
                    name="title"
                  >
                    <Field :data-invalid="!!errors.length">
                      <FieldLabel for="event-create-title">
                        {{ $t('admin.event_create.title_label') }}
                      </FieldLabel>
                      <Input
                        id="event-create-title"
                        :model-value="field.value"
                        :placeholder="$t('admin.event_create.title_placeholder')"
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
                    name="slug"
                  >
                    <Field :data-invalid="!!errors.length">
                      <FieldLabel for="event-create-slug">
                        {{ $t('admin.event_create.slug_label') }}
                      </FieldLabel>
                      <Input
                        id="event-create-slug"
                        :model-value="field.value"
                        :placeholder="$t('admin.event_create.slug_placeholder')"
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
                    name="subtitle"
                  >
                    <Field :data-invalid="!!errors.length">
                      <FieldLabel for="event-create-subtitle">
                        {{ $t('admin.event_create.subtitle_label') }}
                      </FieldLabel>
                      <Input
                        id="event-create-subtitle"
                        :model-value="field.value"
                        :placeholder="$t('admin.event_create.subtitle_placeholder')"
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
                    name="description"
                  >
                    <Field :data-invalid="!!errors.length">
                      <FieldLabel for="event-create-description">
                        {{ $t('admin.event_create.description_label') }}
                      </FieldLabel>
                      <Textarea
                        id="event-create-description"
                        :model-value="field.value"
                        :placeholder="$t('admin.event_create.description_placeholder')"
                        :aria-invalid="!!errors.length"
                        @update:model-value="field.onChange"
                      />
                      <FieldError
                        v-if="errors.length"
                        :errors="errors"
                      />
                    </Field>
                  </VeeField>
                </FieldGroup>
              </FieldSet>
            </CardContent>
          </Card>
          <Card class="rounded-3xl shadow-sm">
            <CardContent>
              <VeeField
                v-slot="{ field, errors }"
                name="coverImage"
              >
                <Field :data-invalid="!!errors.length">
                  <FieldLabel for="event-create-cover-image">
                    {{ $t('admin.event_create.cover_image_label') }}
                  </FieldLabel>
                  <ImageUpload
                    id="event-create-cover-image"
                    :model-value="field.value ?? ''"
                    :upload-kind="ImageUploadKind.Event"
                    :aria-invalid="!!errors.length"
                    @update:model-value="field.onChange"
                    @blur="field.onBlur"
                  />
                  <FieldDescription>{{ $t('common.optional') }}</FieldDescription>
                  <FieldError
                    v-if="errors.length"
                    :errors="errors"
                  />
                </Field>
              </VeeField>
            </CardContent>
          </Card>
        </div>

        <div
          v-show="currentStep === 2"
          class="mx-auto max-w-6xl space-y-6"
        >
          <Card class="h-fit rounded-3xl shadow-sm">
            <CardContent>
              <VeeField
                v-slot="{ field, errors }"
                name="venueId"
              >
                <Field
                  :data-invalid="!!errors.length"
                  class="gap-4"
                >
                  <FieldLabel id="event-create-venue-label">
                    {{ $t('admin.event_create.venue_label') }}
                  </FieldLabel>
                  <div class="relative">
                    <Search class="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="event-create-venue-search"
                      v-model="venueSearch"
                      :placeholder="$t('admin.venues.search_venues')"
                      :aria-label="$t('admin.venues.search_venues')"
                      class="pl-9"
                    />
                  </div>

                  <ItemGroup
                    v-if="paginatedVenues.length"
                    aria-labelledby="event-create-venue-label"
                    :aria-describedby="errors.length ? 'event-create-venue-error' : undefined"
                    :aria-invalid="!!errors.length"
                    class="grid gap-3 md:grid-cols-2 xl:grid-cols-3"
                  >
                    <Item
                      v-for="venue in paginatedVenues"
                      :key="venue.id"
                      as="button"
                      type="button"
                      variant="outline"
                      class="w-full cursor-pointer items-start rounded-2xl p-4 text-left transition-all hover:-translate-y-0.5 hover:border-primary/50 hover:bg-accent/50 active:scale-[0.98]"
                      :class="[
                        field.value === venue.id && 'border-primary bg-primary/5 shadow-sm ring-2 ring-primary/20',
                      ]"
                      :aria-pressed="field.value === venue.id"
                      :aria-label="`${$t('admin.event_create.venue_label')}: ${venue.name}`"
                      @click="field.onChange(venue.id)"
                    >
                      <ItemMedia
                        variant="icon"
                        class="mt-0.5"
                      >
                        <MapPin />
                      </ItemMedia>
                      <ItemContent class="min-w-0 gap-2">
                        <div class="min-w-0">
                          <ItemTitle class="max-w-full truncate">
                            {{ venue.name }}
                          </ItemTitle>
                          <ItemDescription class="truncate">
                            {{ venue.city }}, {{ venue.country }}
                          </ItemDescription>
                        </div>
                        <ItemDescription class="truncate text-xs">
                          {{ venue.address }}
                        </ItemDescription>
                      </ItemContent>
                      <ItemActions class="ml-auto flex-col items-end gap-2">
                        <Badge
                          variant="secondary"
                          class="gap-1 rounded-full"
                        >
                          <Users class="size-3" />
                          {{ venue.capacity }}
                        </Badge>
                        <Check
                          v-if="field.value === venue.id"
                          class="size-4 text-primary"
                        />
                      </ItemActions>
                    </Item>
                  </ItemGroup>

                  <Empty
                    v-else
                    class="rounded-2xl border border-dashed px-4 py-8"
                  >
                    <EmptyHeader>
                      <EmptyMedia variant="icon">
                        <SearchX />
                      </EmptyMedia>
                      <EmptyTitle>{{ $t('errors.no_result') }}</EmptyTitle>
                      <EmptyDescription>{{ $t('blog.no_results_description') }}</EmptyDescription>
                    </EmptyHeader>
                  </Empty>

                  <FieldError
                    v-if="errors.length"
                    id="event-create-venue-error"
                    :errors="errors"
                  />
                </Field>
              </VeeField>
            </CardContent>
            <CardFooter class="flex flex-col gap-3 border-t sm:flex-row sm:items-center sm:justify-between">
              <p class="text-sm text-muted-foreground">
                {{ filteredVenues.length }} · {{ venuePage }} / {{ venuePageCount }}
              </p>
              <div class="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  :disabled="venuePage <= 1"
                  @click="goToPreviousVenuePage"
                >
                  {{ $t('data_table.previous') }}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  :disabled="venuePage >= venuePageCount"
                  @click="goToNextVenuePage"
                >
                  {{ $t('data_table.next') }}
                </Button>
              </div>
            </CardFooter>
          </Card>

          <Card class="rounded-3xl shadow-sm">
            <CardHeader>
              <CardTitle class="text-base">
                {{ selectedVenueDetail?.venue.name || selectedVenue?.name || $t('admin.event_create.choose_venue') }}
              </CardTitle>
              <CardDescription>
                {{ $t('admin.event_create.choose_venue_prompt') }}
              </CardDescription>
            </CardHeader>
            <CardContent class="flex flex-col gap-6">
              <div
                v-if="isLoadingVenueDetail"
                class="flex flex-col gap-4"
              >
                <div class="grid gap-3 sm:grid-cols-3">
                  <Skeleton class="h-20 rounded-2xl" />
                  <Skeleton class="h-20 rounded-2xl" />
                  <Skeleton class="h-20 rounded-2xl" />
                </div>
                <Skeleton class="h-72 rounded-3xl" />
              </div>

              <div
                v-else-if="selectedVenueDetail"
                class="flex flex-col gap-4"
              >
                <div class="grid gap-3 sm:grid-cols-3">
                  <div class="rounded-2xl bg-muted/50 px-4 py-3">
                    <p class="text-xs text-muted-foreground">
                      {{ $t('common.sections') }}
                    </p>
                    <p class="text-lg font-semibold tabular-nums text-foreground">
                      {{ selectedVenueDetail.sections.length }}
                    </p>
                  </div>
                  <div class="rounded-2xl bg-muted/50 px-4 py-3">
                    <p class="text-xs text-muted-foreground">
                      {{ $t('common.rows') }}
                    </p>
                    <p class="text-lg font-semibold tabular-nums text-foreground">
                      {{ totalRows }}
                    </p>
                  </div>
                  <div class="rounded-2xl bg-muted/50 px-4 py-3">
                    <p class="text-xs text-muted-foreground">
                      {{ $t('admin.event_create.seats_label') }}
                    </p>
                    <p class="text-lg font-semibold tabular-nums text-foreground">
                      {{ totalSeats }}
                    </p>
                  </div>
                </div>

                <div class="grid gap-2 lg:max-h-72 lg:grid-cols-2 lg:overflow-y-auto lg:pr-1">
                  <div
                    v-for="section in selectedVenueDetail.sections"
                    :key="section.id"
                    class="flex items-center justify-between gap-3 rounded-2xl border bg-background px-4 py-3"
                  >
                    <div class="flex min-w-0 items-center gap-3">
                      <span
                        class="h-3 w-3 shrink-0 rounded-full"
                        :style="{ backgroundColor: section.color }"
                      />
                      <p class="truncate text-sm font-medium text-foreground">
                        {{ section.name }}
                      </p>
                    </div>
                    <p class="shrink-0 text-sm tabular-nums text-muted-foreground">
                      {{ $t('admin.event_create.seat_count', { count: section.rows.reduce((count, row) => count + row.seats.length, 0) }) }}
                    </p>
                  </div>
                </div>

                <div class="rounded-3xl border bg-muted/20 p-4">
                  <TicketEventSeatMapExperience
                    :seats="previewSeats"
                    :ticket-types="[]"
                    :action-label="null"
                    mode="admin"
                  />
                </div>
              </div>

              <div
                v-else
                class="rounded-3xl border border-dashed px-5 py-10 text-center text-sm text-muted-foreground"
              >
                {{ $t('admin.event_create.choose_venue_prompt') }}
              </div>
            </CardContent>
          </Card>
        </div>

        <AdminEventsAdminEventSessionEditor
          v-show="currentStep === 3"
          class="mx-auto max-w-7xl"
          :model-value="values.sessions"
          :venue-sections="selectedVenueDetail?.sections ?? []"
          :default-venue-id="values.venueId"
          :validation-errors="sessionValidationErrors"
          @update:model-value="updateSessions"
        />

        <div
          v-show="currentStep === 4"
          class="mx-auto grid max-w-6xl gap-4 lg:grid-cols-3"
        >
          <Card class="rounded-3xl shadow-sm">
            <CardHeader>
              <div>
                <CardTitle class="text-base">
                  {{ $t('admin.event_create.identity') }}
                </CardTitle>
                <CardDescription>{{ values.slug || $t('admin.event_create.slug_placeholder') }}</CardDescription>
              </div>
              <CardAction>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  class="h-8 px-2"
                  :aria-label="$t('common.edit') + ' ' + $t('admin.event_create.identity')"
                  @click="currentStep = 1"
                >
                  {{ $t('common.edit') }}
                </Button>
              </CardAction>
            </CardHeader>
            <CardContent class="flex flex-col gap-3 text-sm">
              <div>
                <p class="text-muted-foreground">
                  {{ $t('admin.event_create.title_label') }}
                </p>
                <p class="font-medium text-foreground">
                  {{ values.title || $t('admin.event_create.title_placeholder') }}
                </p>
              </div>
              <div>
                <p class="text-muted-foreground">
                  {{ $t('admin.event_create.subtitle_label') }}
                </p>
                <p class="font-medium text-foreground">
                  {{ values.subtitle || $t('admin.event_create.subtitle_placeholder') }}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card class="rounded-3xl shadow-sm">
            <CardHeader>
              <div>
                <CardTitle class="text-base">
                  {{ $t('admin.event_create.venue_label') }}
                </CardTitle>
                <CardDescription>
                  {{ selectedVenueDetail?.venue.name || $t('admin.event_create.choose_venue') }}
                </CardDescription>
              </div>
              <CardAction>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  class="h-8 px-2"
                  :aria-label="$t('common.edit') + ' ' + $t('admin.event_create.venue_label')"
                  @click="currentStep = 2"
                >
                  {{ $t('common.edit') }}
                </Button>
              </CardAction>
            </CardHeader>
            <CardContent class="grid gap-3 text-sm sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
              <div class="rounded-2xl bg-muted/50 px-4 py-3">
                <p class="text-xs text-muted-foreground">
                  {{ $t('common.sections') }}
                </p>
                <p class="font-semibold tabular-nums text-foreground">
                  {{ selectedVenueDetail?.sections.length ?? 0 }}
                </p>
              </div>
              <div class="rounded-2xl bg-muted/50 px-4 py-3">
                <p class="text-xs text-muted-foreground">
                  {{ $t('common.rows') }}
                </p>
                <p class="font-semibold tabular-nums text-foreground">
                  {{ totalRows }}
                </p>
              </div>
              <div class="rounded-2xl bg-muted/50 px-4 py-3">
                <p class="text-xs text-muted-foreground">
                  {{ $t('admin.event_create.seats_label') }}
                </p>
                <p class="font-semibold tabular-nums text-foreground">
                  {{ totalSeats }}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card class="rounded-3xl shadow-sm">
            <CardHeader>
              <div>
                <CardTitle class="text-base">
                  {{ $t('common.sessions') }}
                </CardTitle>
                <CardDescription>{{ $t('admin.event_create.step_sessions_desc') }}</CardDescription>
              </div>
              <CardAction>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  class="h-8 px-2"
                  :aria-label="$t('common.edit') + ' ' + $t('common.sessions')"
                  @click="currentStep = 3"
                >
                  {{ $t('common.edit') }}
                </Button>
              </CardAction>
            </CardHeader>
            <CardContent>
              <dl class="flex flex-col gap-3 text-sm">
                <div class="rounded-2xl bg-muted/50 px-4 py-3">
                  <dt class="text-xs text-muted-foreground">
                    {{ $t('admin.event_create.number_of_sessions') }}
                  </dt>
                  <dd class="font-semibold tabular-nums text-foreground">
                    {{ values.sessions.length }}
                  </dd>
                </div>
              </dl>
            </CardContent>
          </Card>
        </div>
      </motion.div>

      <div class="fixed inset-x-4 bottom-[calc(1rem+env(safe-area-inset-bottom,0px))] z-30 rounded-3xl border bg-background/95 p-3 shadow-lg backdrop-blur supports-[backdrop-filter]:bg-background/80 md:left-[calc(var(--sidebar-width)+1rem)] md:right-4 md:group-has-data-[collapsible=icon]/sidebar-wrapper:left-[calc(var(--sidebar-width-icon)+2rem)] md:group-has-data-[collapsible=offcanvas]/sidebar-wrapper:left-4">
        <div
          class="mx-auto flex flex-col gap-3 md:flex-row md:items-center md:justify-between"
          :class="currentStep === 3 ? 'max-w-7xl' : 'max-w-6xl'"
        >
          <div class="text-sm text-muted-foreground">
            <span class="font-medium text-foreground">{{ steps[currentStep - 1]?.title }}</span>
            <span class="hidden sm:inline"> · {{ steps[currentStep - 1]?.description }}</span>
          </div>
          <div class="flex items-center gap-2 text-xs text-muted-foreground md:ml-auto md:mr-3">
            <component
              :is="autosaveIcon"
              class="size-3.5"
              :class="autosaveStatus === 'saving' && 'animate-spin'"
            />
            <span>{{ autosaveLabel }}</span>
          </div>
          <div class="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="outline"
              :disabled="currentStep === 1"
              class="active:scale-[0.96]"
              @click="goPrevious"
            >
              {{ $t('admin.event_create.back') }}
            </Button>
            <Button
              v-if="currentStep < steps.length"
              type="button"
              :disabled="currentStep === 2 && !canContinueFromVenueStep"
              class="active:scale-[0.96]"
              @click="goNext"
            >
              {{ $t('common.continue') }}
            </Button>
            <Button
              v-else
              type="submit"
              :is-loading="isSaving"
              class="active:scale-[0.96]"
            >
              {{ $t('admin.event_create.save_draft') }}
            </Button>
          </div>
        </div>
      </div>
    </form>
  </div>
</template>
