<script setup lang="ts">
import { CalendarClock, CircleDollarSign, PlusIcon, ShieldCheck, Ticket, TrashIcon } from '@lucide/vue'

interface EventSessionTicketTypeInput {
  name: string
  venueSectionId: number | null
  priceCents: number
  currency: string
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
  locked?: boolean
  defaultVenueId?: number
}>()

const emit = defineEmits<{
  'update:modelValue': [value: EventSessionEditorInput[]]
}>()

function addSession() {
  const newSession: EventSessionEditorInput = {
    label: `Session ${props.modelValue.length + 1}`,
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
    return 'General admission'
  }

  return props.venueSections.find(section => section.id === sectionId)?.name ?? 'Unknown section'
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
          Event sessions
        </h3>
        <p class="mt-1 text-sm text-muted-foreground">
          Configure the dates, demand controls, and ticket releases buyers can book.
        </p>
      </div>

      <Button
        variant="outline"
        size="sm"
        class="w-full sm:w-auto"
        :disabled="locked"
        @click="addSession"
      >
        <PlusIcon class="mr-2 size-4" />
        Add session
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
        <EmptyTitle>No sessions configured</EmptyTitle>
        <EmptyDescription>
          Add one session to define when this event can be booked.
        </EmptyDescription>
      </EmptyHeader>
    </Empty>

    <div class="space-y-4">
      <Card
        v-for="(session, sessionIndex) in modelValue"
        :key="sessionIndex"
        class="overflow-hidden shadow-none"
      >
        <CardHeader class="border-b bg-muted/20">
          <div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div class="min-w-0 space-y-1">
              <div class="flex flex-wrap items-center gap-2">
                <CardTitle class="truncate text-xl tracking-[-0.04em]">
                  {{ session.label || `Session ${sessionIndex + 1}` }}
                </CardTitle>
                <Badge variant="outline">
                  {{ session.ticketTypes.length }} release{{ session.ticketTypes.length === 1 ? '' : 's' }}
                </Badge>
              </div>
              <p class="text-sm text-muted-foreground">
                Session {{ sessionIndex + 1 }} controls its own schedule, access pacing, and prices.
              </p>
            </div>

            <Button
              variant="ghost"
              size="icon"
              class="self-start text-muted-foreground hover:text-destructive"
              :disabled="locked || modelValue.length === 1"
              aria-label="Remove session"
              @click="removeSession(sessionIndex)"
            >
              <TrashIcon class="size-4" />
            </Button>
          </div>
        </CardHeader>

        <CardContent class="space-y-6">
          <ItemGroup>
            <Item class="grid gap-4 md:grid-cols-[2.5rem_minmax(0,1fr)]">
              <ItemMedia variant="icon">
                <CalendarClock />
              </ItemMedia>
              <ItemContent class="space-y-4">
                <div>
                  <ItemTitle>Schedule</ItemTitle>
                  <ItemDescription>Set the public session name and time window.</ItemDescription>
                </div>

                <div class="grid gap-4 md:grid-cols-2">
                  <div class="space-y-2 md:col-span-2">
                    <Label :for="`session-${sessionIndex}-label`">Label</Label>
                    <Input
                      :id="`session-${sessionIndex}-label`"
                      :model-value="session.label"
                      :disabled="locked"
                      placeholder="Friday night, matinee, closing show"
                      @update:model-value="value => updateSession(sessionIndex, { label: String(value) })"
                    />
                  </div>

                  <div class="space-y-2">
                    <Label :for="`session-${sessionIndex}-starts-at`">Starts at</Label>
                    <Input
                      :id="`session-${sessionIndex}-starts-at`"
                      type="datetime-local"
                      :model-value="session.startsAt"
                      :disabled="locked"
                      @update:model-value="value => updateSession(sessionIndex, { startsAt: String(value) })"
                    />
                  </div>

                  <div class="space-y-2">
                    <Label :for="`session-${sessionIndex}-ends-at`">Ends at</Label>
                    <Input
                      :id="`session-${sessionIndex}-ends-at`"
                      type="datetime-local"
                      :model-value="session.endsAt"
                      :disabled="locked"
                      @update:model-value="value => updateSession(sessionIndex, { endsAt: String(value) })"
                    />
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
                  <ItemTitle>Sales window</ItemTitle>
                  <ItemDescription>Bookings are only accepted during this range.</ItemDescription>
                </div>

                <div class="grid gap-4 md:grid-cols-2">
                  <div class="space-y-2">
                    <Label :for="`session-${sessionIndex}-sales-start-at`">Sales start</Label>
                    <Input
                      :id="`session-${sessionIndex}-sales-start-at`"
                      type="datetime-local"
                      :model-value="session.salesStartAt"
                      :disabled="locked"
                      @update:model-value="value => updateSession(sessionIndex, { salesStartAt: String(value) })"
                    />
                  </div>

                  <div class="space-y-2">
                    <Label :for="`session-${sessionIndex}-sales-end-at`">Sales end</Label>
                    <Input
                      :id="`session-${sessionIndex}-sales-end-at`"
                      type="datetime-local"
                      :model-value="session.salesEndAt"
                      :disabled="locked"
                      @update:model-value="value => updateSession(sessionIndex, { salesEndAt: String(value) })"
                    />
                  </div>
                </div>
              </ItemContent>
            </Item>
          </ItemGroup>

          <div class="space-y-4 border-t pt-5">
            <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h4 class="text-sm font-medium text-foreground">
                  Ticket releases
                </h4>
                <p class="mt-1 text-sm text-muted-foreground">
                  Add the price tiers and capacity for this session.
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                :disabled="locked"
                @click="addTicketType(sessionIndex)"
              >
                <PlusIcon class="mr-2 size-4" />
                Add ticket
              </Button>
            </div>

            <Empty
              v-if="!session.ticketTypes.length"
              class="border border-dashed border-border/70 py-6 text-center"
            >
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <Ticket />
                </EmptyMedia>
                <EmptyTitle>No ticket releases</EmptyTitle>
                <EmptyDescription>Add at least one ticket release before publishing.</EmptyDescription>
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
                  <div class="flex flex-wrap items-center gap-2">
                    <ItemTitle>{{ ticketType.name || `Ticket ${ticketIndex + 1}` }}</ItemTitle>
                    <Badge variant="secondary">
                      {{ formatCurrency(ticketType.priceCents, ticketType.currency) }}
                    </Badge>
                    <Badge variant="outline">
                      {{ getSectionName(ticketType.venueSectionId) }}
                    </Badge>
                  </div>

                  <div class="grid gap-3 lg:grid-cols-12">
                    <div class="space-y-2 lg:col-span-3">
                      <Label :for="`session-${sessionIndex}-ticket-${ticketIndex}-name`">Name</Label>
                      <Input
                        :id="`session-${sessionIndex}-ticket-${ticketIndex}-name`"
                        :model-value="ticketType.name"
                        :disabled="locked"
                        @update:model-value="value => updateTicketType(sessionIndex, ticketIndex, { name: String(value) })"
                      />
                    </div>

                    <div class="space-y-2 lg:col-span-3">
                      <Label :for="`session-${sessionIndex}-ticket-${ticketIndex}-section`">Section</Label>
                      <Select
                        :model-value="ticketType.venueSectionId ? String(ticketType.venueSectionId) : 'none'"
                        :disabled="locked"
                        @update:model-value="value => updateTicketType(sessionIndex, ticketIndex, { venueSectionId: value === 'none' ? null : Number(value) })"
                      >
                        <SelectTrigger :id="`session-${sessionIndex}-ticket-${ticketIndex}-section`">
                          <SelectValue placeholder="General admission" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">
                            General admission
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
                    </div>

                    <div class="space-y-2 lg:col-span-2">
                      <Label :for="`session-${sessionIndex}-ticket-${ticketIndex}-price`">Price cents</Label>
                      <Input
                        :id="`session-${sessionIndex}-ticket-${ticketIndex}-price`"
                        type="number"
                        min="0"
                        :model-value="String(ticketType.priceCents)"
                        :disabled="locked"
                        @update:model-value="value => updateTicketType(sessionIndex, ticketIndex, { priceCents: Number(value) })"
                      />
                    </div>

                    <div class="space-y-2 lg:col-span-2">
                      <Label :for="`session-${sessionIndex}-ticket-${ticketIndex}-capacity`">Capacity</Label>
                      <Input
                        :id="`session-${sessionIndex}-ticket-${ticketIndex}-capacity`"
                        type="number"
                        min="0"
                        :model-value="String(ticketType.capacity)"
                        :disabled="locked"
                        @update:model-value="value => updateTicketType(sessionIndex, ticketIndex, { capacity: Number(value) })"
                      />
                    </div>

                    <div class="flex items-end lg:col-span-2">
                      <div class="flex min-h-10 items-center gap-2 rounded-lg bg-muted/40 px-3">
                        <Switch
                          :checked="ticketType.isReservedSeating"
                          :disabled="locked"
                          @update:checked="value => updateTicketType(sessionIndex, ticketIndex, { isReservedSeating: Boolean(value) })"
                        />
                        <Label class="text-xs text-muted-foreground">Reserved</Label>
                      </div>
                    </div>
                  </div>
                </ItemContent>

                <ItemActions class="md:pt-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    class="text-muted-foreground hover:text-destructive"
                    :disabled="locked"
                    aria-label="Remove ticket release"
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
