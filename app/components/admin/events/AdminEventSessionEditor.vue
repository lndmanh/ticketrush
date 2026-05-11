<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { AlertCircle, CalendarClock, ChevronDown, CircleDollarSign, PlusIcon, TrashIcon } from '@lucide/vue'
import { PricingMode } from '#shared/commonEnums'

interface EventSessionSectionPriceInput {
  id?: number
  venueSectionId: number
  sectionNameSnapshot?: string
  sectionColorSnapshot?: string
  priceCents: number
  currency: string
  sortOrder: number
}

interface EventSessionSeatOverrideInput {
  id?: number
  venueSeatId: number
  venueSectionId: number
  priceCents: number | null
  currency: string | null
  isDisabled: boolean
}

interface EventSessionEditorInput {
  id?: number
  publicId?: string
  label: string
  venueId: number
  status?: string
  queueEnabled: boolean
  startsAt: string
  endsAt: string
  salesStartAt: string
  salesEndAt: string
  pricingMode: PricingMode
  currency: string
  sectionPrices: EventSessionSectionPriceInput[]
  seatOverrides: EventSessionSeatOverrideInput[]
}

interface VenueSectionEditorInput {
  id: number
  name: string
  color: string
  capacity?: number
  rows?: Array<{ seats: Array<{ id?: number }> }>
}

const props = defineProps<{
  modelValue: EventSessionEditorInput[]
  venueSections: VenueSectionEditorInput[]
  validationErrors?: Record<string, string>
  locked?: boolean
  defaultVenueId?: number
}>()

const emit = defineEmits<{
  'update:modelValue': [value: EventSessionEditorInput[]]
}>()

const openSessionIndexes = ref<number[]>([0])
const perSectionPriceCache = ref<Record<string, EventSessionSectionPriceInput[]>>({})
const clientSessionSequence = ref(0)

const invalidSessionIndexes = computed(() => {
  const indexes: number[] = []
  const errors = props.validationErrors ?? {}

  for (const path of Object.keys(errors)) {
    const parts = path.split('.')
    if (parts[0] !== 'sessions') {
      continue
    }

    const index = Number(parts[1])
    if (Number.isInteger(index) && !indexes.includes(index)) {
      indexes.push(index)
    }
  }

  return indexes
})

watch(invalidSessionIndexes, (indexes) => {
  if (!indexes.length) {
    return
  }

  openSessionIndexes.value = [...new Set([...openSessionIndexes.value, ...indexes])]
})

watch(() => props.modelValue.length, (length) => {
  if (length > 0 && !openSessionIndexes.value.includes(length - 1)) {
    openSessionIndexes.value = [...openSessionIndexes.value, length - 1]
  }
})

watch(() => props.modelValue, (sessions) => {
  let shouldEmit = false
  const nextSessions = sessions.map((session) => {
    if (session.id || session.publicId) {
      return session
    }

    shouldEmit = true
    return {
      ...session,
      publicId: createClientSessionPublicId(),
    }
  })

  if (shouldEmit) {
    emit('update:modelValue', nextSessions)
  }
}, { immediate: true })

function createClientSessionPublicId() {
  clientSessionSequence.value += 1
  return `client-session-${Date.now()}-${clientSessionSequence.value}`
}

function isSessionOpen(index: number) {
  return openSessionIndexes.value.includes(index)
}

function toggleSession(index: number) {
  if (isSessionOpen(index)) {
    openSessionIndexes.value = openSessionIndexes.value.filter(openIndex => openIndex !== index)
    return
  }

  openSessionIndexes.value = [...openSessionIndexes.value, index]
}

function getError(path: string) {
  return props.validationErrors?.[path] ?? ''
}

function formatPriceInputValue(priceCents: number) {
  return String(priceCents / 100)
}

function parsePriceInputValue(value: string | number | null | undefined) {
  if (value === null || value === undefined) {
    return 0
  }

  const price = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(price) || price <= 0) {
    return 0
  }

  return Math.round(price * 100)
}

function getSessionError(sessionIndex: number, fieldName: string) {
  return getError(`sessions.${sessionIndex}.${fieldName}`)
}

function getSectionPriceError(sessionIndex: number, sectionIndex: number, fieldName: string) {
  return getError(`sessions.${sessionIndex}.sectionPrices.${sectionIndex}.${fieldName}`)
}

function sessionHasErrors(sessionIndex: number) {
  return invalidSessionIndexes.value.includes(sessionIndex)
}

function getSessionErrorMessages(sessionIndex: number) {
  const prefix = `sessions.${sessionIndex}.`
  const errors = props.validationErrors ?? {}

  return Object.entries(errors)
    .filter(([path]) => path.startsWith(prefix))
    .map(([, message]) => message)
}

function addSession() {
  const newSession: EventSessionEditorInput = {
    id: undefined,
    publicId: createClientSessionPublicId(),
    label: `Session ${props.modelValue.length + 1}`,
    venueId: props.defaultVenueId && props.defaultVenueId > 0 ? props.defaultVenueId : (props.modelValue.find(session => session.venueId > 0)?.venueId ?? 0),
    status: undefined,
    queueEnabled: false,
    startsAt: '',
    endsAt: '',
    salesStartAt: '',
    salesEndAt: '',
    pricingMode: PricingMode.Uniform,
    currency: 'VND',
    sectionPrices: props.venueSections.map((section, sectionIndex) => ({
      venueSectionId: section.id,
      sectionNameSnapshot: section.name,
      sectionColorSnapshot: section.color,
      priceCents: 0,
      currency: 'VND',
      sortOrder: sectionIndex,
    })),
    seatOverrides: [],
  }

  emit('update:modelValue', [...props.modelValue, newSession])
}

function removeSession(index: number) {
  const next = [...props.modelValue]
  next.splice(index, 1)
  emit('update:modelValue', next)
}

function updateSession(index: number, updates: Partial<EventSessionEditorInput>) {
  const currentSession = props.modelValue[index]
  if (!currentSession) {
    return
  }

  const next = [...props.modelValue]
  next[index] = { ...currentSession, ...updates }
  emit('update:modelValue', next)
}

function getSessionStableKey(session: EventSessionEditorInput) {
  if (session.id) {
    return `id:${session.id}`
  }

  if (session.publicId) {
    return `public:${session.publicId}`
  }

  return ''
}

function getSessionCacheKey(session: EventSessionEditorInput) {
  return getSessionStableKey(session)
}

function getPricingModeSwitchId(session: EventSessionEditorInput) {
  return `session-${getSessionStableKey(session) || 'pending'}-same-price`
}

function cacheSectionPrices(session: EventSessionEditorInput) {
  const cacheKey = getSessionCacheKey(session)
  if (!cacheKey) {
    return
  }

  perSectionPriceCache.value = {
    ...perSectionPriceCache.value,
    [cacheKey]: buildSectionPrices(session),
  }
}

function getSectionSeatCount(section: VenueSectionEditorInput) {
  if (typeof section.capacity === 'number') {
    return section.capacity
  }

  return section.rows?.reduce((count, row) => count + row.seats.length, 0) ?? 0
}

function getSectionPrice(session: EventSessionEditorInput, section: VenueSectionEditorInput, sectionIndex: number) {
  const existing = session.sectionPrices.find(sectionPrice => sectionPrice.venueSectionId === section.id)
  if (existing) {
    return existing
  }

  return {
    venueSectionId: section.id,
    sectionNameSnapshot: section.name,
    sectionColorSnapshot: section.color,
    priceCents: 0,
    currency: session.currency || 'VND',
    sortOrder: sectionIndex,
  }
}

function buildSectionPrices(session: EventSessionEditorInput, uniformPriceCents?: number) {
  return props.venueSections.map((section, sectionIndex) => {
    const current = getSectionPrice(session, section, sectionIndex)
    const priceCents = uniformPriceCents === undefined ? current.priceCents : uniformPriceCents

    return {
      ...current,
      venueSectionId: section.id,
      sectionNameSnapshot: section.name,
      sectionColorSnapshot: section.color,
      priceCents,
      currency: session.currency || current.currency || 'VND',
      sortOrder: sectionIndex,
    }
  })
}

function getUniformPriceCents(session: EventSessionEditorInput) {
  return session.sectionPrices[0]?.priceCents ?? 0
}

function updatePricingMode(sessionIndex: number, isUniform: boolean) {
  const session = props.modelValue[sessionIndex]
  if (!session) {
    return
  }

  const uniformPriceCents = getUniformPriceCents(session)
  if (isUniform) {
    cacheSectionPrices(session)
  }

  const cacheKey = getSessionCacheKey(session)
  const cachedSectionPrices = cacheKey ? perSectionPriceCache.value[cacheKey] : undefined
  updateSession(sessionIndex, {
    pricingMode: isUniform ? PricingMode.Uniform : PricingMode.Section,
    sectionPrices: isUniform ? buildSectionPrices(session, uniformPriceCents) : (cachedSectionPrices ?? buildSectionPrices(session)),
  })
}

function updateUniformPrice(sessionIndex: number, priceCents: number) {
  const session = props.modelValue[sessionIndex]
  if (!session) {
    return
  }

  updateSession(sessionIndex, { sectionPrices: buildSectionPrices(session, priceCents) })
}

function updateSectionPrice(sessionIndex: number, sectionIndex: number, section: VenueSectionEditorInput, priceCents: number) {
  const session = props.modelValue[sessionIndex]
  if (!session) {
    return
  }

  const nextSectionPrices = buildSectionPrices(session)
  const current = nextSectionPrices[sectionIndex]
  if (!current) {
    return
  }

  nextSectionPrices[sectionIndex] = {
    ...current,
    venueSectionId: section.id,
    sectionNameSnapshot: section.name,
    sectionColorSnapshot: section.color,
    priceCents,
  }

  const cacheKey = getSessionCacheKey(session)
  if (cacheKey) {
    perSectionPriceCache.value = {
      ...perSectionPriceCache.value,
      [cacheKey]: nextSectionPrices,
    }
  }
  updateSession(sessionIndex, { sectionPrices: nextSectionPrices })
}
</script>

<template>
  <div class="space-y-5">
    <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h3 class="text-2xl font-semibold tracking-[-0.03em] text-foreground">
          Event sessions
        </h3>
      </div>

      <Button
        type="button"
        variant="outline"
        size="sm"
        class="w-full sm:w-auto"
        :disabled="locked"
        @click="addSession"
      >
        <PlusIcon class="mr-2 size-4" />
        {{ $t('admin.event_session.add_session') }}
      </Button>
    </div>

    <Empty
      v-if="!modelValue.length"
      class="border-dashed py-10"
    >
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <CalendarClock />
        </EmptyMedia>
        <EmptyTitle>{{ $t('admin.event_session.empty_title') }}</EmptyTitle>
        <EmptyDescription>
          {{ $t('admin.event_session.empty_desc') }}
        </EmptyDescription>
      </EmptyHeader>
    </Empty>

    <div class="space-y-4">
      <Card
        v-for="(session, sessionIndex) in modelValue"
        :key="session.id || session.publicId"
        class="overflow-hidden shadow-none pt-0 gap-0!"
        :class="sessionHasErrors(sessionIndex) && 'border-destructive/60'"
      >
        <CardHeader class="border-b bg-muted/20 pb-0! py-3">
          <div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div class="min-w-0 space-y-1">
              <div class="flex flex-wrap items-center gap-2">
                <CardTitle class="truncate text-xl tracking-[-0.04em]">
                  {{ session.label || $t('admin.event_session.session_label') + ` ${sessionIndex + 1}` }}
                </CardTitle>
                <Badge variant="outline">
                  {{ $t('admin.event_session.section_count', { n: venueSections.length }) }}
                </Badge>
                <Badge
                  v-if="sessionHasErrors(sessionIndex)"
                  variant="destructive"
                  class="gap-1"
                >
                  <AlertCircle class="size-3" />
                  {{ $t('admin.event_session.needs_attention') }}
                </Badge>
              </div>
              <ul
                v-if="sessionHasErrors(sessionIndex)"
                class="mt-3 space-y-1 text-sm text-destructive"
              >
                <li
                  v-for="message in getSessionErrorMessages(sessionIndex).slice(0, 3)"
                  :key="message"
                >
                  {{ message }}
                </li>
              </ul>
            </div>

            <div class="flex items-center gap-1 self-start">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                class="text-muted-foreground"
                :aria-expanded="isSessionOpen(sessionIndex)"
                :aria-label="isSessionOpen(sessionIndex) ? $t('admin.event_session.collapse') : $t('admin.event_session.expand')"
                @click="toggleSession(sessionIndex)"
              >
                <ChevronDown
                  class="size-4 transition-transform"
                  :class="!isSessionOpen(sessionIndex) && '-rotate-90'"
                />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                class="text-muted-foreground hover:text-destructive"
                :disabled="locked || modelValue.length === 1"
                :aria-label="$t('admin.event_session.remove_session')"
                @click="removeSession(sessionIndex)"
              >
                <TrashIcon class="size-4" />
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent
          v-show="isSessionOpen(sessionIndex)"
          class="space-y-6"
        >
          <ItemGroup>
            <Item class="grid gap-4 md:grid-cols-[2.5rem_minmax(0,1fr)] px-0">
              <ItemMedia variant="icon">
                <CalendarClock />
              </ItemMedia>
              <ItemContent class="space-y-4">
                <div>
                  <ItemTitle>{{ $t('admin.event_session.schedule') }}</ItemTitle>
                  <ItemDescription>{{ $t('admin.event_session.schedule_desc') }}</ItemDescription>
                </div>

                <div class="grid gap-4 md:grid-cols-2">
                  <div class="space-y-2 md:col-span-2">
                    <Label :for="`session-${sessionIndex}-label`">{{ $t('admin.event_session.label') }}</Label>
                    <Input
                      :id="`session-${sessionIndex}-label`"
                      :model-value="session.label"
                      :disabled="locked"
                      :placeholder="$t('admin.event_session.label_placeholder')"
                      :aria-invalid="!!getSessionError(sessionIndex, 'label')"
                      @update:model-value="value => updateSession(sessionIndex, { label: String(value) })"
                    />
                    <p
                      v-if="getSessionError(sessionIndex, 'label')"
                      class="text-sm text-destructive"
                    >
                      {{ getSessionError(sessionIndex, 'label') }}
                    </p>
                  </div>

                  <div class="space-y-2">
                    <Label :for="`session-${sessionIndex}-starts-at`">{{ $t('admin.event_session.starts_at') }}</Label>
                    <AdminEventsAdminEventDateTimePicker
                      :id="`session-${sessionIndex}-starts-at`"
                      :model-value="session.startsAt"
                      :disabled="locked"
                      :aria-invalid="!!getSessionError(sessionIndex, 'startsAt')"
                      :placeholder="$t('admin.event_session.pick_datetime')"
                      :time-label="$t('admin.event_session.time')"
                      :clear-label="$t('admin.event_session.clear_datetime')"
                      :date-placeholder="$t('admin.event_session.choose_date_first')"
                      @update:model-value="value => updateSession(sessionIndex, { startsAt: String(value) })"
                    />
                    <p
                      v-if="getSessionError(sessionIndex, 'startsAt')"
                      class="text-sm text-destructive"
                    >
                      {{ getSessionError(sessionIndex, 'startsAt') }}
                    </p>
                  </div>

                  <div class="space-y-2">
                    <Label :for="`session-${sessionIndex}-ends-at`">{{ $t('admin.event_session.ends_at') }}</Label>
                    <AdminEventsAdminEventDateTimePicker
                      :id="`session-${sessionIndex}-ends-at`"
                      :model-value="session.endsAt"
                      :disabled="locked"
                      :aria-invalid="!!getSessionError(sessionIndex, 'endsAt')"
                      :placeholder="$t('admin.event_session.pick_datetime')"
                      :time-label="$t('admin.event_session.time')"
                      :clear-label="$t('admin.event_session.clear_datetime')"
                      :date-placeholder="$t('admin.event_session.choose_date_first')"
                      @update:model-value="value => updateSession(sessionIndex, { endsAt: String(value) })"
                    />
                    <p
                      v-if="getSessionError(sessionIndex, 'endsAt')"
                      class="text-sm text-destructive"
                    >
                      {{ getSessionError(sessionIndex, 'endsAt') }}
                    </p>
                  </div>
                </div>
              </ItemContent>
            </Item>

            <Item class="grid gap-4 md:grid-cols-[2.5rem_minmax(0,1fr)] px-0">
              <ItemMedia variant="icon">
                <CircleDollarSign />
              </ItemMedia>
              <ItemContent class="space-y-4">
                <div>
                  <ItemTitle>{{ $t('admin.event_session.sales_window') }}</ItemTitle>
                  <ItemDescription>{{ $t('admin.event_session.sales_window_desc') }}</ItemDescription>
                </div>

                <div class="grid gap-4 md:grid-cols-2">
                  <div class="space-y-2">
                    <Label :for="`session-${sessionIndex}-sales-start-at`">{{ $t('admin.event_session.sales_start') }}</Label>
                    <AdminEventsAdminEventDateTimePicker
                      :id="`session-${sessionIndex}-sales-start-at`"
                      :model-value="session.salesStartAt"
                      :disabled="locked"
                      :aria-invalid="!!getSessionError(sessionIndex, 'salesStartAt')"
                      :placeholder="$t('admin.event_session.pick_datetime')"
                      :time-label="$t('admin.event_session.time')"
                      :clear-label="$t('admin.event_session.clear_datetime')"
                      :date-placeholder="$t('admin.event_session.choose_date_first')"
                      @update:model-value="value => updateSession(sessionIndex, { salesStartAt: String(value) })"
                    />
                    <p
                      v-if="getSessionError(sessionIndex, 'salesStartAt')"
                      class="text-sm text-destructive"
                    >
                      {{ getSessionError(sessionIndex, 'salesStartAt') }}
                    </p>
                  </div>

                  <div class="space-y-2">
                    <Label :for="`session-${sessionIndex}-sales-end-at`">{{ $t('admin.event_session.sales_end') }}</Label>
                    <AdminEventsAdminEventDateTimePicker
                      :id="`session-${sessionIndex}-sales-end-at`"
                      :model-value="session.salesEndAt"
                      :disabled="locked"
                      :aria-invalid="!!getSessionError(sessionIndex, 'salesEndAt')"
                      :placeholder="$t('admin.event_session.pick_datetime')"
                      :time-label="$t('admin.event_session.time')"
                      :clear-label="$t('admin.event_session.clear_datetime')"
                      :date-placeholder="$t('admin.event_session.choose_date_first')"
                      @update:model-value="value => updateSession(sessionIndex, { salesEndAt: String(value) })"
                    />
                    <p
                      v-if="getSessionError(sessionIndex, 'salesEndAt')"
                      class="text-sm text-destructive"
                    >
                      {{ getSessionError(sessionIndex, 'salesEndAt') }}
                    </p>
                  </div>
                </div>
              </ItemContent>
            </Item>
          </ItemGroup>

          <div class="space-y-4 border-t pt-5">
            <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h4 class="text-sm font-medium text-foreground">
                  {{ $t('admin.event_session.section_pricing') }}
                </h4>
                <p class="mt-1 text-sm text-muted-foreground">
                  {{ $t('admin.event_session.section_pricing_desc') }}
                </p>
              </div>
              <div class="flex items-center gap-2 rounded-lg border bg-muted/20 px-3 py-2">
                <Switch
                  :id="getPricingModeSwitchId(session)"
                  :model-value="session.pricingMode === PricingMode.Uniform"
                  :disabled="locked"
                  @update:model-value="value => updatePricingMode(sessionIndex, Boolean(value))"
                />
                <Label
                  :for="getPricingModeSwitchId(session)"
                  class="text-sm text-foreground"
                >
                  {{ $t('admin.event_session.same_price_all_sections') }}
                </Label>
              </div>
            </div>

            <Empty
              v-if="!venueSections.length"
              class="border border-dashed border-border/70 py-6 text-center px-0"
              :class="getSessionError(sessionIndex, 'sectionPrices') && 'border-destructive/60'"
            >
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <CircleDollarSign />
                </EmptyMedia>
                <EmptyTitle>{{ $t('admin.event_session.no_sections') }}</EmptyTitle>
                <EmptyDescription>
                  {{ getSessionError(sessionIndex, 'sectionPrices') || $t('admin.event_session.no_sections_desc') }}
                </EmptyDescription>
              </EmptyHeader>
            </Empty>

            <ItemGroup v-else>
              <Item
                v-if="session.pricingMode === PricingMode.Uniform"
                variant="muted"
              >
                <ItemMedia variant="icon">
                  <CircleDollarSign />
                </ItemMedia>
                <ItemContent>
                  <ItemTitle>{{ $t('admin.event_session.all_sections') }}</ItemTitle>
                  <ItemDescription>
                    {{ $t('admin.event_session.all_sections_desc', { count: venueSections.length }) }}
                  </ItemDescription>
                  <p
                    v-if="getSessionError(sessionIndex, 'sectionPrices')"
                    class="text-sm text-destructive"
                  >
                    {{ getSessionError(sessionIndex, 'sectionPrices') }}
                  </p>
                </ItemContent>
                <ItemActions>
                  <Label :for="`session-${sessionIndex}-uniform-price`">{{ $t('admin.event_session.price_cents') }}</Label>
                  <Input
                    :id="`session-${sessionIndex}-uniform-price`"
                    type="number"
                    min="0"
                    step="0.01"
                    :model-value="formatPriceInputValue(getUniformPriceCents(session))"
                    :disabled="locked"
                    :aria-invalid="!!getSessionError(sessionIndex, 'sectionPrices')"
                    @update:model-value="value => updateUniformPrice(sessionIndex, parsePriceInputValue(value))"
                  />
                </ItemActions>
              </Item>

              <template v-else>
                <ItemGroup class="flex w-full flex-col gap-3">
                  <Item
                    v-for="(section, sectionIndex) in venueSections"
                    :key="section.id"
                    variant="muted"
                  >
                    <ItemMedia variant="icon">
                      <span
                        class="size-4 rounded-full border border-background shadow-sm"
                        :style="{ backgroundColor: section.color }"
                      />
                    </ItemMedia>

                    <ItemContent>
                      <ItemTitle class="truncate">
                        {{ section.name }}
                      </ItemTitle>
                      <ItemDescription>{{ $t('admin.event_session.section_capacity', { count: getSectionSeatCount(section) }) }}</ItemDescription>
                      <p
                        v-if="getSectionPriceError(sessionIndex, sectionIndex, 'priceCents')"
                        class="text-sm text-destructive"
                      >
                        {{ getSectionPriceError(sessionIndex, sectionIndex, 'priceCents') }}
                      </p>
                    </ItemContent>
                    <ItemActions>
                      <Label :for="`session-${sessionIndex}-section-${section.id}-price`">{{ $t('admin.event_session.price_cents') }}</Label>
                      <Input
                        :id="`session-${sessionIndex}-section-${section.id}-price`"
                        type="number"
                        min="0"
                        step="0.01"
                        :model-value="formatPriceInputValue(getSectionPrice(session, section, sectionIndex).priceCents)"
                        :disabled="locked"
                        :aria-invalid="!!getSectionPriceError(sessionIndex, sectionIndex, 'priceCents')"
                        @update:model-value="value => updateSectionPrice(sessionIndex, sectionIndex, section, parsePriceInputValue(value))"
                      />
                    </ItemActions>
                  </Item>
                </ItemGroup>
              </template>
            </ItemGroup>
          </div>
        </CardContent>
      </Card>
    </div>
  </div>
</template>
