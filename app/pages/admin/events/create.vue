<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { Field as VeeField, useForm } from 'vee-validate'
import { motion } from 'motion-v'
import { toast } from 'vue-sonner'
import { Check, Circle, Cloud, CloudAlert, Dot, Loader2 } from '@lucide/vue'
import { apiRequest } from '@/utils/apiRequest'
import { parseApiError } from '@/utils/apiError'
import { getDisplayDateLocale } from '@/lib/localizedEvents'
import { apiRoutes } from '#shared/apiRoutes'
import { eventComposerSchema, getEventSessionTimingIssues } from '#shared/schemas/ticketingSchema'
import type { Venue } from '#shared/db'
import type { EventAutosaveDraftInput, EventComposerInput } from '#shared/schemas/ticketingSchema'
import type { ApiResponse } from '~~/types/api'
import type { AutosaveDraftDeleteData, AutosaveDraftDetail } from '~~/types/admin-events'
import type { SeatMapSeat } from '~~/types/seatmap'
import type { VenueDetail, VenueDetailSection } from '~~/types/venues'
import { EventStatus, PricingMode, SeatPricingSource, SeatStatus } from '#shared/commonEnums'

interface VenueOption {
  id: number
  name: string
}

const { locale, t, te } = useI18n()

function tx(key: string, fallback: string) {
  return te(key) ? t(key) : fallback
}

function txParams(key: string, params: Record<string, string | number>, fallback: string) {
  return te(key) ? t(key, params) : fallback
}

function formatDateTime(value: string | Date) {
  return new Date(value).toLocaleString(getDisplayDateLocale(locale.value))
}

interface EventCreationStep {
  step: number
  title: string
  description: string
}

const steps: EventCreationStep[] = [
  { step: 1, title: 'admin.event_create.step_basics', description: 'admin.event_create.step_basics_desc' },
  { step: 2, title: 'admin.event_create.step_venue', description: 'admin.event_create.step_venue_desc' },
  { step: 3, title: 'admin.event_create.step_sessions', description: 'admin.event_create.step_sessions_desc' },
  { step: 4, title: 'admin.event_create.step_review', description: 'admin.event_create.step_review_desc' },
]

const fallbackText: Record<string, string> = {
  'admin.event_create.page_title': 'Tạo sự kiện',
  'admin.event_create.breadcrumb': 'Tạo sự kiện',
  'admin.event_create.step_basics': 'Cơ bản',
  'admin.event_create.step_basics_desc': 'Thông tin sự kiện',
  'admin.event_create.step_venue': 'Địa điểm',
  'admin.event_create.step_venue_desc': 'Chọn địa điểm',
  'admin.event_create.step_sessions': 'Suất diễn',
  'admin.event_create.step_sessions_desc': 'Lịch trình và giá vé',
  'admin.event_create.step_review': 'Xem lại',
  'admin.event_create.step_review_desc': 'Xác nhận và lưu',
  'admin.event_create.identity': 'Danh tính',
  'admin.event_create.event_basics': 'Thông tin cơ bản',
  'admin.event_create.title_label': 'Tiêu đề',
  'admin.event_create.title_placeholder': 'Midnight Skyline Live',
  'admin.event_create.slug_label': 'Slug',
  'admin.event_create.slug_placeholder': 'midnight-skyline-live',
  'admin.event_create.subtitle_label': 'Phụ đề',
  'admin.event_create.subtitle_placeholder': 'Một đêm nhạc điện tử cao cấp tại Sài Gòn.',
  'admin.event_create.description_label': 'Mô tả',
  'admin.event_create.description_placeholder': 'Mô tả sự kiện.',
  'admin.event_create.cover_image_label': 'URL ảnh bìa',
  'admin.event_create.cover_image_placeholder': 'https://example.com/event-cover.jpg',
  'admin.event_create.venue_label': 'Địa điểm',
  'admin.event_create.choose_venue': 'Chọn bản thiết kế địa điểm',
  'admin.event_create.choose_venue_prompt': 'Chọn địa điểm để tạo giá khu vực và xem trước bố cục.',
  'admin.event_create.review_title': 'Xem lại và gửi',
  'admin.event_create.number_of_sessions': 'Số suất diễn',
  'admin.event_session.default_session': 'Suất diễn mặc định',
  'admin.event_session.session_number': 'Suất diễn {index}',
  'admin.event_session.validation_add_session': 'Thêm ít nhất một suất diễn trước khi tiếp tục',
  'admin.event_session.validation_label_required': 'Cần nhập nhãn suất diễn',
  'admin.event_session.validation_section_pricing_required': 'Thêm giá khu vực trước khi tiếp tục',
  'admin.event_session.validation_price_non_negative': 'Giá không được âm',
  'admin.event_session.validation_fix_prefix': 'Vui lòng sửa',
  'admin.event_session.validation_more': '{count} lỗi khác',
  'admin.event_session.validation_session_start_required': 'Cần chọn thời gian bắt đầu suất diễn',
  'admin.event_session.validation_session_start_future': 'Thời gian bắt đầu suất diễn phải ở tương lai',
  'admin.event_session.validation_session_end_valid': 'Thời gian kết thúc suất diễn phải là ngày giờ hợp lệ',
  'admin.event_session.validation_session_end_after_start': 'Thời gian kết thúc phải sau thời gian bắt đầu',
  'admin.event_session.validation_sales_start_required': 'Cần chọn thời gian bắt đầu bán',
  'admin.event_session.validation_sales_end_required': 'Cần chọn thời gian kết thúc bán',
  'admin.event_session.validation_sales_end_after_start': 'Thời gian kết thúc bán phải sau thời gian bắt đầu bán',
  'admin.event_session.validation_sales_start_before_session': 'Thời gian bắt đầu bán phải trước khi suất diễn bắt đầu',
  'admin.event_session.validation_sales_end_before_session': 'Thời gian bán phải kết thúc trước khi suất diễn bắt đầu',
  'admin.event_create.back': 'Quay lại',
  'admin.event_create.save_draft': 'Lưu bản nháp',
  'admin.event_create.fix_fields': 'Vui lòng sửa các trường được đánh dấu',
  'admin.event_create.saving_draft': 'Đang lưu bản nháp…',
  'admin.event_create.draft_saved_generic': 'Bản nháp đã lưu',
  'admin.event_create.autosave_failed': 'Tự lưu thất bại',
  'admin.event_create.autosave_restored': 'Bản nháp tự lưu đã được khôi phục',
  'admin.event_create.jump_error': 'Hoàn thành bước hiện tại trước khi chuyển sang bước tiếp theo',
  'common.continue': 'Tiếp tục',
  'common.optional': 'Tùy chọn',
  'common.edit': 'Chỉnh sửa',
  'common.sections': 'Khu vực',
  'common.rows': 'Hàng',
  'common.seats': 'ghế',
}

function tt(key: string) {
  return tx(key, fallbackText[key] ?? key)
}

function ttParams(key: string, params: Record<string, string | number>, fallback: string) {
  return txParams(key, params, fallback)
}

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
const venues = computed<VenueOption[]>(() => venuesResponse.value?.data ?? [])
const selectedVenueDetail = ref<VenueDetail | null>(null)
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

function updateEventIdentityField(fieldName: keyof Pick<EventComposerInput, 'title' | 'slug' | 'subtitle' | 'description' | 'coverImage'>, value: string | number) {
  setFieldValue(fieldName, String(value), true)
  setFieldError(fieldName, '')
}

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
    return tt('admin.event_create.saving_draft')
  }

  if (autosaveStatus.value === 'saved') {
    return lastAutosavedAt.value ? t('admin.event_create.draft_saved_at', { time: lastAutosavedAt.value.toLocaleTimeString() }) : tt('admin.event_create.draft_saved_generic')
  }

  if (autosaveStatus.value === 'error') {
    return tt('admin.event_create.autosave_failed')
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
    label: tt('admin.event_session.default_session'),
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
      label: session.label ?? ttParams('admin.event_session.session_number', { index: sessionIndex + 1 }, `Suất diễn ${sessionIndex + 1}`),
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
    toast.error(parseApiError(error, 'We could not load the autosave draft').message)
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
    toast.error(parseApiError(error, 'We could not check for autosave drafts').message)
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
  currentStep.value = Math.min(Math.max(draft.lastSavedStep, 1), steps.length)
  highestReachedStep.value = Math.max(currentStep.value, 1)
  pendingAutosaveDraft.value = null
  isAutosaveRestoreDialogOpen.value = false
  lastAutosaveSignature.value = ''
  if (import.meta.client) {
    window.localStorage.setItem('ticketrush:event-create-autosave-key', draft.draftKey)
  }
  toast.success(tt('admin.event_create.autosave_restored'))
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
    toast.success('Autosave draft discarded')
  }
  catch (error) {
    toast.error(parseApiError(error, 'Failed to discard autosave draft').message)
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

watch(() => values.venueId, async (venueId) => {
  venueLoadRequestId += 1
  const requestId = venueLoadRequestId
  const previousVenueId = selectedVenueDetail.value?.venue.id

  if (!venueId) {
    selectedVenueDetail.value = null
    return
  }

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
})

const previewSeats = computed<SeatMapSeat[]>(() => {
  if (!selectedVenueDetail.value) {
    return []
  }

  const firstSession = values.sessions?.[0]

  return selectedVenueDetail.value.sections.flatMap(section => section.rows.flatMap((row, rowIndex) => row.seats.map((seat) => {
    const sectionPrice = firstSession?.sectionPrices.find(price => price.venueSectionId === section.id)

    return {
      id: seat.id,
      venueSectionId: section.id,
      ticketTypeId: null,
      sectionNameSnapshot: section.name,
      rowLabelSnapshot: row.label,
      seatLabelSnapshot: seat.label,
      displayX: Math.max(seat.seatNumber - 1, 0),
      displayY: rowIndex,
      status: SeatStatus.Available,
      priceCents: sectionPrice?.priceCents ?? 0,
      currency: sectionPrice?.currency ?? firstSession?.currency ?? 'VND',
      pricingSource: SeatPricingSource.Section,
    }
  })))
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
    addSessionValidationError(errors, 'sessions', tt('admin.event_session.validation_add_session'))
    return errors
  }

  sessions.forEach((session, sessionIndex) => {
    const sessionLabel = session.label?.trim() || ttParams('admin.event_session.session_number', { index: sessionIndex + 1 }, `Suất diễn ${sessionIndex + 1}`)

    if (!session.label?.trim()) {
      addSessionValidationError(errors, getSessionFieldPath(sessionIndex, 'label'), formatSessionValidationMessage(sessionLabel, tt('admin.event_session.validation_label_required')))
    }

    for (const issue of getEventSessionTimingIssues(session, sessionLabel)) {
      addSessionValidationError(errors, getSessionFieldPath(sessionIndex, issue.field), localizeSessionTimingIssue(issue.message, sessionLabel))
    }

    if (!session.sectionPrices.length) {
      addSessionValidationError(errors, getSessionFieldPath(sessionIndex, 'sectionPrices'), formatSessionValidationMessage(sessionLabel, tt('admin.event_session.validation_section_pricing_required')))
    }

    session.sectionPrices.forEach((sectionPrice, sectionIndex) => {
      const sectionLabel = `${sessionLabel}, ${ttParams('admin.event_session.section_number', { index: sectionIndex + 1 }, `khu vực ${sectionIndex + 1}`)}`

      if (sectionPrice.priceCents < 0) {
        addSessionValidationError(errors, getSectionPriceFieldPath(sessionIndex, sectionIndex, 'priceCents'), formatSessionValidationMessage(sectionLabel, tt('admin.event_session.validation_price_non_negative')))
      }
    })
  })

  return errors
}

function formatSessionValidationMessage(label: string, message: string) {
  return `${label}: ${message}`
}

function localizeSessionTimingIssue(message: string, sessionLabel: string) {
  const suffix = message.startsWith(`${sessionLabel}: `) ? message.slice(sessionLabel.length + 2) : message
  const messageBySuffix: Record<string, string> = {
    'Session start is required': tt('admin.event_session.validation_session_start_required'),
    'Session start must be in the future': tt('admin.event_session.validation_session_start_future'),
    'Session end must be a valid date and time': tt('admin.event_session.validation_session_end_valid'),
    'Session end must be after the session start': tt('admin.event_session.validation_session_end_after_start'),
    'Sales start is required': tt('admin.event_session.validation_sales_start_required'),
    'Sales end is required': tt('admin.event_session.validation_sales_end_required'),
    'Sales end must be after sales start': tt('admin.event_session.validation_sales_end_after_start'),
    'Sales start must be before the session starts': tt('admin.event_session.validation_sales_start_before_session'),
    'Sales must end before the session starts': tt('admin.event_session.validation_sales_end_before_session'),
  }

  return formatSessionValidationMessage(sessionLabel, messageBySuffix[suffix] ?? suffix)
}

function showSessionValidationToast(errors: Record<string, string>) {
  const messages = Object.values(errors)
  const firstMessages = messages.slice(0, 4)
  const remainingCount = Math.max(messages.length - firstMessages.length, 0)
  const suffix = remainingCount ? ` (${ttParams('admin.event_session.validation_more', { count: remainingCount }, `${remainingCount} lỗi khác`)})` : ''
  toast.error(`${tt('admin.event_session.validation_fix_prefix')} ${tt('admin.event_create.step_sessions')}: ${firstMessages.join('; ')}${suffix}`)
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
    return true
  }

  const messages: string[] = []
  for (const issue of result.error.issues) {
    const pathPart = issue.path[0]
    if (typeof pathPart === 'string') {
      setFieldError(pathPart, issue.message)
      messages.push(issue.message)
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
    toast.error(tt('admin.event_create.jump_error'))
    return
  }

  if (validateUntilStep(step)) {
    void saveAutosaveDraft()
    currentStep.value = step
    highestReachedStep.value = Math.max(highestReachedStep.value, step)
  }
}

function goNext() {
  if (currentStep.value >= steps.length) {
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
          toast.warning(parseApiError(error, 'Event saved, but the autosave draft could not be discarded').message)
        }
      }

      toast.success('Draft event saved')
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
      toast.error(parseApiError(error, 'We could not save the event draft').message)
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

    const firstError = Object.values(errors).flat().filter(Boolean)[0] || tt('admin.event_create.fix_fields')
    toast.error(firstError)
  },
)

definePageMeta({
  title: 'admin.event_create.page_title',
  breadcrumb: 'admin.event_create.breadcrumb',
  middleware: ['auth', 'admin'],
  layout: 'dashboard',
})

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
            {{ $t('admin.event_create.restore_dialog_desc', { title: pendingAutosaveDraft?.payload.title || $t('admin.events.untitled_event'), step: pendingAutosaveDraft?.lastSavedStep ?? 1, date: pendingAutosaveDraft?.updatedAt ? $t('admin.event_create.restore_dialog_date', { date: formatDateTime(pendingAutosaveDraft.updatedAt) }) : '' }) }}
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
            {{ tt(step.title) }}
          </StepperTitle>
          <StepperDescription
            :class="[state === 'active' && 'text-primary']"
            class="sr-only text-xs text-muted-foreground transition md:not-sr-only lg:text-sm"
          >
            {{ tt(step.description) }}
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
        <Card
          v-show="currentStep === 1"
          class="rounded-3xl shadow-sm"
        >
          <CardHeader>
            <CardTitle class="text-base">
              {{ tt('admin.event_create.identity') }}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <FieldSet>
              <FieldLegend>{{ tt('admin.event_create.event_basics') }}</FieldLegend>
              <FieldGroup>
                <VeeField
                  v-slot="{ field, errors }"
                  name="title"
                >
                  <Field :data-invalid="!!errors.length">
                    <FieldLabel for="event-create-title">
                      {{ tt('admin.event_create.title_label') }}
                    </FieldLabel>
                    <Input
                      id="event-create-title"
                      :model-value="field.value"
                      :placeholder="tt('admin.event_create.title_placeholder')"
                      :aria-invalid="!!errors.length"
                      @update:model-value="updateEventIdentityField('title', $event)"
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
                      {{ tt('admin.event_create.slug_label') }}
                    </FieldLabel>
                    <Input
                      id="event-create-slug"
                      :model-value="field.value"
                      :placeholder="tt('admin.event_create.slug_placeholder')"
                      :aria-invalid="!!errors.length"
                      @update:model-value="updateEventIdentityField('slug', $event)"
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
                      {{ tt('admin.event_create.subtitle_label') }}
                    </FieldLabel>
                    <Input
                      id="event-create-subtitle"
                      :model-value="field.value"
                      :placeholder="tt('admin.event_create.subtitle_placeholder')"
                      :aria-invalid="!!errors.length"
                      @update:model-value="updateEventIdentityField('subtitle', $event)"
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
                      {{ tt('admin.event_create.description_label') }}
                    </FieldLabel>
                    <Textarea
                      id="event-create-description"
                      :model-value="field.value"
                      :placeholder="tt('admin.event_create.description_placeholder')"
                      :aria-invalid="!!errors.length"
                      @update:model-value="updateEventIdentityField('description', $event)"
                    />
                    <FieldError
                      v-if="errors.length"
                      :errors="errors"
                    />
                  </Field>
                </VeeField>

                <VeeField
                  v-slot="{ field, errors }"
                  name="coverImage"
                >
                  <Field :data-invalid="!!errors.length">
                    <FieldLabel for="event-create-cover-image">
                      {{ tt('admin.event_create.cover_image_label') }}
                    </FieldLabel>
                    <Input
                      id="event-create-cover-image"
                      :model-value="field.value"
                      :placeholder="tt('admin.event_create.cover_image_placeholder')"
                      :aria-invalid="!!errors.length"
                      @update:model-value="updateEventIdentityField('coverImage', $event)"
                    />
                    <FieldDescription>{{ tt('common.optional') }}</FieldDescription>
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

        <Card
          v-show="currentStep === 2"
          class="rounded-3xl shadow-sm"
        >
          <CardHeader>
            <CardTitle class="text-base">
              {{ tt('admin.event_create.step_venue') }}
            </CardTitle>
          </CardHeader>
          <CardContent class="space-y-6">
            <VeeField
              v-slot="{ field, errors }"
              name="venueId"
            >
              <Field :data-invalid="!!errors.length">
                <FieldLabel for="event-create-venue">
                  {{ tt('admin.event_create.venue_label') }}
                </FieldLabel>
                <Select
                  :model-value="field.value ? String(field.value) : undefined"
                  @update:model-value="field.onChange(Number($event))"
                >
                  <SelectTrigger
                    id="event-create-venue"
                    :aria-invalid="!!errors.length"
                  >
                    <SelectValue :placeholder="field.value ? undefined : tt('admin.event_create.choose_venue')" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem
                      v-for="venue in venues"
                      :key="venue.id"
                      :value="String(venue.id)"
                    >
                      {{ venue.name }}
                    </SelectItem>
                  </SelectContent>
                </Select>
                <FieldError
                  v-if="errors.length"
                  :errors="errors"
                />
              </Field>
            </VeeField>

            <div
              v-if="selectedVenueDetail"
              class="space-y-4"
            >
              <div class="grid gap-3 sm:grid-cols-3">
                <div class="rounded-2xl bg-muted/50 px-4 py-3">
                  <p class="text-xs text-muted-foreground">
                    {{ tt('common.sections') }}
                  </p>
                  <p class="text-lg font-semibold tabular-nums text-foreground">
                    {{ selectedVenueDetail.sections.length }}
                  </p>
                </div>
                <div class="rounded-2xl bg-muted/50 px-4 py-3">
                  <p class="text-xs text-muted-foreground">
                    {{ tt('common.rows') }}
                  </p>
                  <p class="text-lg font-semibold tabular-nums text-foreground">
                    {{ totalRows }}
                  </p>
                </div>
                <div class="rounded-2xl bg-muted/50 px-4 py-3">
                  <p class="text-xs text-muted-foreground">
                    {{ tt('common.seats') }}
                  </p>
                  <p class="text-lg font-semibold tabular-nums text-foreground">
                    {{ totalSeats }}
                  </p>
                </div>
              </div>

              <div class="space-y-2">
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
                    {{ section.rows.reduce((count, row) => count + row.seats.length, 0) }} {{ tt('common.seats') }}
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
              {{ tt('admin.event_create.choose_venue_prompt') }}
            </div>
          </CardContent>
        </Card>

        <AdminEventsAdminEventSessionEditor
          v-show="currentStep === 3"
          :model-value="values.sessions"
          :venue-sections="selectedVenueDetail?.sections ?? []"
          :default-venue-id="values.venueId"
          :validation-errors="sessionValidationErrors"
          @update:model-value="updateSessions"
        />

        <Card
          v-show="currentStep === 4"
          class="rounded-3xl shadow-sm"
        >
          <CardHeader>
            <CardTitle class="text-base">
              {{ tt('admin.event_create.review_title') }}
            </CardTitle>
          </CardHeader>
          <CardContent class="space-y-4">
            <div class="grid gap-4 md:grid-cols-2">
              <Card class="rounded-2xl bg-muted/20 shadow-none">
                <CardHeader class="flex flex-row items-center justify-between gap-3 pb-3">
                  <CardTitle class="text-sm">
                    {{ tt('admin.event_create.step_sessions') }}
                  </CardTitle>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    class="h-8 px-2"
                    @click="currentStep = 3"
                  >
                    {{ tt('common.edit') }}
                  </Button>
                </CardHeader>
                <CardContent>
                  <dl class="space-y-4 text-sm">
                    <div class="space-y-1">
                      <dt class="text-muted-foreground">
                        {{ tt('admin.event_create.number_of_sessions') }}
                      </dt>
                      <dd class="font-medium">
                        {{ values.sessions.length }}
                      </dd>
                    </div>
                  </dl>
                </CardContent>
              </Card>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <div class="fixed inset-x-4 bottom-[calc(1rem+env(safe-area-inset-bottom,0px))] z-30 rounded-3xl border bg-background/95 p-3 shadow-lg backdrop-blur supports-[backdrop-filter]:bg-background/80 md:left-[calc(var(--sidebar-width)+1rem)] md:right-4 md:group-has-data-[collapsible=icon]/sidebar-wrapper:left-[calc(var(--sidebar-width-icon)+2rem)] md:group-has-data-[collapsible=offcanvas]/sidebar-wrapper:left-4">
        <div class="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div class="text-sm text-muted-foreground">
            <span class="font-medium text-foreground">{{ tt(steps[currentStep - 1]?.title ?? '') }}</span>
            <span class="hidden sm:inline"> · {{ tt(steps[currentStep - 1]?.description ?? '') }}</span>
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
              {{ tt('admin.event_create.back') }}
            </Button>
            <Button
              v-if="currentStep < steps.length"
              type="button"
              class="active:scale-[0.96]"
              @click="goNext"
            >
              {{ tt('common.continue') }}
            </Button>
            <Button
              v-else
              type="submit"
              :is-loading="isSaving"
              class="active:scale-[0.96]"
            >
              {{ tt('admin.event_create.save_draft') }}
            </Button>
          </div>
        </div>
      </div>
    </form>
  </div>
</template>
