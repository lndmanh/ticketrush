<script setup lang="ts">
import { computed, ref, watch } from 'vue'

const { t } = useI18n()
import { AlertCircle, CalendarClock, ChevronDown, CircleDollarSign, PlusIcon, Ticket, TrashIcon } from '@lucide/vue'

interface EventSessionTicketTypeInput {
  name: string
  venueSectionId: number | null
  priceCents: number
  currency: string
  color: string
  isReservedSeating: boolean
  capacity: number
  sortOrder: number
}

interface EventSessionEditorInput {
  label: string
  venueId: number
  startsAt: string
  endsAt: string
  salesStartAt: string
  salesEndAt: string
  ticketTypes: EventSessionTicketTypeInput[]
}

const props = defineProps<{
  modelValue: EventSessionEditorInput[]
  venueSections: Array<{ id: number, name: string, color: string }>
  validationErrors?: Record<string, string>
  locked?: boolean
  defaultVenueId?: number
}>()

const emit = defineEmits<{
  'update:modelValue': [value: EventSessionEditorInput[]]
}>()

const openSessionIndexes = ref<number[]>([0])

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

function getSessionError(sessionIndex: number, fieldName: string) {
  return getError(`sessions.${sessionIndex}.${fieldName}`)
}

function getTicketError(sessionIndex: number, ticketIndex: number, fieldName: string) {
  return getError(`sessions.${sessionIndex}.ticketTypes.${ticketIndex}.${fieldName}`)
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
    label: `${t('admin.event_session.session_label')} ${props.modelValue.length + 1}`,
    venueId: props.defaultVenueId && props.defaultVenueId > 0 ? props.defaultVenueId : (props.modelValue.find(session => session.venueId > 0)?.venueId ?? 0),
    startsAt: '',
    endsAt: '',
    salesStartAt: '',
    salesEndAt: '',
    ticketTypes: [],
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

function addTicketType(sessionIndex: number) {
  const session = props.modelValue[sessionIndex]
  if (!session) {
    return
  }

  const newTicketType: EventSessionTicketTypeInput = {
    name: 'General Admission',
    venueSectionId: null,
    priceCents: 0,
    currency: 'VND',
    color: '#3b82f6',
    isReservedSeating: false,
    capacity: 100,
    sortOrder: session.ticketTypes.length,
  }

  updateSession(sessionIndex, { ticketTypes: [...session.ticketTypes, newTicketType] })
}

function removeTicketType(sessionIndex: number, ticketIndex: number) {
  const session = props.modelValue[sessionIndex]
  if (!session) {
    return
  }

  const nextTicketTypes = [...session.ticketTypes]
  nextTicketTypes.splice(ticketIndex, 1)
  updateSession(sessionIndex, { ticketTypes: nextTicketTypes })
}

function updateTicketType(sessionIndex: number, ticketIndex: number, updates: Partial<EventSessionTicketTypeInput>) {
  const session = props.modelValue[sessionIndex]
  const ticketType = session?.ticketTypes[ticketIndex]
  if (!session || !ticketType) {
    return
  }

  const nextTicketTypes = [...session.ticketTypes]
  nextTicketTypes[ticketIndex] = { ...ticketType, ...updates }
  updateSession(sessionIndex, { ticketTypes: nextTicketTypes })
}

function getSectionName(sectionId: number | null) {
  if (!sectionId) {
    return t('admin.event_session.general_admission')
  }

  return props.venueSections.find(section => section.id === sectionId)?.name ?? t('admin.event_session.unknown_section')
}

function formatCurrency(value: number, currency: string) {
  return `${Intl.NumberFormat('en-US').format(value / 100)} ${currency}`
}
</script>

<template>
  <div class="space-y-5">
    <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h3 class="text-lg font-semibold tracking-[-0.03em] text-foreground">
          {{ $t('admin.event_session.title') }}
        </h3>
        <p class="mt-1 text-sm text-muted-foreground">
          {{ $t('admin.event_session.desc') }}
        </p>
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
        :key="sessionIndex"
        class="overflow-hidden shadow-none"
        :class="sessionHasErrors(sessionIndex) && 'border-destructive/60'"
      >
        <CardHeader class="border-b bg-muted/20">
          <div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div class="min-w-0 space-y-1">
              <div class="flex flex-wrap items-center gap-2">
                <CardTitle class="truncate text-xl tracking-[-0.04em]">
                  {{ session.label || `${$t('admin.event_session.session_label')} ${sessionIndex + 1}` }}
                </CardTitle>
                <Badge variant="outline">
                  {{ $t('admin.event_session.release_count', session.ticketTypes.length) }}
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
              <p class="text-sm text-muted-foreground">
                {{ $t('admin.event_session.session_controls', { index: sessionIndex + 1 }) }}
              </p>
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
            <Item class="grid gap-4 md:grid-cols-[2.5rem_minmax(0,1fr)]">
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
                    <Input
                      :id="`session-${sessionIndex}-starts-at`"
                      type="datetime-local"
                      :model-value="session.startsAt"
                      :disabled="locked"
                      :aria-invalid="!!getSessionError(sessionIndex, 'startsAt')"
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
                    <Input
                      :id="`session-${sessionIndex}-ends-at`"
                      type="datetime-local"
                      :model-value="session.endsAt"
                      :disabled="locked"
                      :aria-invalid="!!getSessionError(sessionIndex, 'endsAt')"
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

            <Item class="grid gap-4 md:grid-cols-[2.5rem_minmax(0,1fr)]">
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
                    <Input
                      :id="`session-${sessionIndex}-sales-start-at`"
                      type="datetime-local"
                      :model-value="session.salesStartAt"
                      :disabled="locked"
                      :aria-invalid="!!getSessionError(sessionIndex, 'salesStartAt')"
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
                    <Input
                      :id="`session-${sessionIndex}-sales-end-at`"
                      type="datetime-local"
                      :model-value="session.salesEndAt"
                      :disabled="locked"
                      :aria-invalid="!!getSessionError(sessionIndex, 'salesEndAt')"
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
                  {{ $t('admin.event_session.ticket_releases') }}
                </h4>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                :disabled="locked"
                @click="addTicketType(sessionIndex)"
              >
                <PlusIcon class="mr-2 size-4" />
                {{ $t('admin.event_session.add_ticket_release') }}
              </Button>
            </div>

            <Empty
              v-if="!session.ticketTypes.length"
              class="border border-dashed border-border/70 py-6 text-center"
              :class="getSessionError(sessionIndex, 'ticketTypes') && 'border-destructive/60'"
            >
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <Ticket />
                </EmptyMedia>
                <EmptyTitle>{{ $t('admin.event_session.no_releases') }}</EmptyTitle>
                <EmptyDescription>
                  {{ getSessionError(sessionIndex, 'ticketTypes') || $t('admin.event_session.no_releases_desc') }}
                </EmptyDescription>
              </EmptyHeader>
            </Empty>

            <ItemGroup v-else>
              <Item
                v-for="(ticketType, ticketIndex) in session.ticketTypes"
                :key="ticketIndex"
                variant="ghost"
                class="grid gap-4 md:grid-cols-[2.5rem_minmax(0,1fr)_auto]"
              >
                <ItemMedia variant="icon">
                  <Ticket />
                </ItemMedia>

                <ItemContent class="space-y-4">
                  <div class="grid gap-3 lg:grid-cols-12">
                    <div class="space-y-2 lg:col-span-3">
                      <Label :for="`session-${sessionIndex}-ticket-${ticketIndex}-name`">{{ $t('admin.event_session.ticket_name') }}</Label>
                      <Input
                        :id="`session-${sessionIndex}-ticket-${ticketIndex}-name`"
                        :model-value="ticketType.name"
                        :disabled="locked"
                        :aria-invalid="!!getTicketError(sessionIndex, ticketIndex, 'name')"
                        @update:model-value="value => updateTicketType(sessionIndex, ticketIndex, { name: String(value) })"
                      />
                      <p
                        v-if="getTicketError(sessionIndex, ticketIndex, 'name')"
                        class="text-sm text-destructive"
                      >
                        {{ getTicketError(sessionIndex, ticketIndex, 'name') }}
                      </p>
                    </div>

                    <div class="space-y-2 lg:col-span-3">
                      <Label :for="`session-${sessionIndex}-ticket-${ticketIndex}-section`">{{ $t('admin.event_session.section') }}</Label>
                      <Select
                        :model-value="ticketType.venueSectionId ? String(ticketType.venueSectionId) : 'none'"
                        :disabled="locked"
                        @update:model-value="value => updateTicketType(sessionIndex, ticketIndex, { venueSectionId: value === 'none' ? null : Number(value) })"
                      >
                        <SelectTrigger
                          :id="`session-${sessionIndex}-ticket-${ticketIndex}-section`"
                          :aria-invalid="!!getTicketError(sessionIndex, ticketIndex, 'venueSectionId')"
                        >
                          <SelectValue :placeholder="$t('admin.event_session.general_admission')" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">
                            {{ $t('admin.event_session.general_admission') }}
                          </SelectItem>
                          <SelectItem
                            v-for="section in venueSections"
                            :key="section.id"
                            :value="String(section.id)"
                          >
                            {{ section.name }}
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      <p
                        v-if="getTicketError(sessionIndex, ticketIndex, 'venueSectionId')"
                        class="text-sm text-destructive"
                      >
                        {{ getTicketError(sessionIndex, ticketIndex, 'venueSectionId') }}
                      </p>
                    </div>

                    <div class="space-y-2 lg:col-span-2">
                      <Label :for="`session-${sessionIndex}-ticket-${ticketIndex}-price`">{{ $t('admin.event_session.price_cents') }}</Label>
                      <Input
                        :id="`session-${sessionIndex}-ticket-${ticketIndex}-price`"
                        type="number"
                        min="0"
                        :model-value="String(ticketType.priceCents)"
                        :disabled="locked"
                        :aria-invalid="!!getTicketError(sessionIndex, ticketIndex, 'priceCents')"
                        @update:model-value="value => updateTicketType(sessionIndex, ticketIndex, { priceCents: Number(value) })"
                      />
                      <p
                        v-if="getTicketError(sessionIndex, ticketIndex, 'priceCents')"
                        class="text-sm text-destructive"
                      >
                        {{ getTicketError(sessionIndex, ticketIndex, 'priceCents') }}
                      </p>
                    </div>

                    <div class="space-y-2 lg:col-span-2">
                      <Label :for="`session-${sessionIndex}-ticket-${ticketIndex}-capacity`">{{ $t('admin.event_session.capacity') }}</Label>
                      <Input
                        :id="`session-${sessionIndex}-ticket-${ticketIndex}-capacity`"
                        type="number"
                        min="0"
                        :model-value="String(ticketType.capacity)"
                        :disabled="locked"
                        :aria-invalid="!!getTicketError(sessionIndex, ticketIndex, 'capacity')"
                        @update:model-value="value => updateTicketType(sessionIndex, ticketIndex, { capacity: Number(value) })"
                      />
                      <p
                        v-if="getTicketError(sessionIndex, ticketIndex, 'capacity')"
                        class="text-sm text-destructive"
                      >
                        {{ getTicketError(sessionIndex, ticketIndex, 'capacity') }}
                      </p>
                    </div>

                    <div class="flex items-end lg:col-span-2">
                      <div class="flex min-h-10 items-center gap-2 rounded-lg bg-muted/40 px-3">
                        <Switch
                          :model-value="ticketType.isReservedSeating"
                          :disabled="locked"
                          @update:model-value="value => updateTicketType(sessionIndex, ticketIndex, { isReservedSeating: Boolean(value) })"
                        />
                        <Label class="text-xs text-muted-foreground">{{ $t('admin.event_session.reserved') }}</Label>
                      </div>
                    </div>
                  </div>
                </ItemContent>

                <ItemActions class="md:pt-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    class="text-muted-foreground hover:text-destructive"
                    :disabled="locked"
                    :aria-label="$t('admin.event_session.remove_ticket_release')"
                    @click="removeTicketType(sessionIndex, ticketIndex)"
                  >
                    <TrashIcon class="size-4" />
                  </Button>
                </ItemActions>
              </Item>
            </ItemGroup>
          </div>
        </CardContent>
      </Card>
    </div>
  </div>
</template>
