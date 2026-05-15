<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { AlertTriangle, Link2, RefreshCw } from '@lucide/vue'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import ResponsiveDialog from '@/components/ResponsiveDialog.vue'
import type { EventSession } from '#shared/db'
import type { AdminEventWorkspaceSession, VenueLayoutSyncApplyInput, VenueLayoutSyncApplyMapping, VenueLayoutSyncPreview } from '~~/types/admin-events'

interface EditableMapping {
  venueSectionId: number
  sourceValue: string
  priceCents: number
  currency: string
}

const NO_SOURCE_VALUE = 'none'

const props = defineProps<{
  open: boolean
  sessionId: number | null
  sessionLabel?: string
  loadPreview: (sessionId: number) => Promise<VenueLayoutSyncPreview>
  applySync: (sessionId: number, payload: VenueLayoutSyncApplyInput) => Promise<AdminEventWorkspaceSession | EventSession | undefined>
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  'applied': []
}>()

const { t } = useI18n()

const preview = ref<VenueLayoutSyncPreview | null>(null)
const mappings = ref<EditableMapping[]>([])
const isLoading = ref(false)
const isApplying = ref(false)
const loadError = ref('')
const applyError = ref('')
let previewRequestId = 0

const firstCurrency = computed(() => preview.value?.oldSections[0]?.currency || 'VND')

const hasInvalidRows = computed(() => mappings.value.some(mapping => !isValidMapping(mapping)))

const canApply = computed(() => {
  return props.sessionId !== null
    && preview.value !== null
    && preview.value.currentSections.length > 0
    && !isLoading.value
    && !isApplying.value
    && !hasInvalidRows.value
})

watch([() => props.open, () => props.sessionId], ([open, sessionId]) => {
  resetState()

  if (!open || sessionId === null) {
    return
  }

  void loadPreviewForSession(sessionId)
}, { immediate: true })

function resetState() {
  previewRequestId += 1
  preview.value = null
  mappings.value = []
  isLoading.value = false
  isApplying.value = false
  loadError.value = ''
  applyError.value = ''
}

async function loadPreviewForSession(sessionId: number) {
  const requestId = previewRequestId
  isLoading.value = true
  loadError.value = ''

  try {
    const nextPreview = await props.loadPreview(sessionId)
    if (requestId !== previewRequestId) {
      return
    }

    preview.value = nextPreview
    mappings.value = buildMappings(nextPreview)
  }
  catch (error) {
    if (requestId !== previewRequestId) {
      return
    }

    loadError.value = getErrorMessage(error, t('admin_event_sync.load_error'))
  }
  finally {
    if (requestId === previewRequestId) {
      isLoading.value = false
    }
  }
}

function buildMappings(nextPreview: VenueLayoutSyncPreview): EditableMapping[] {
  const fallbackCurrency = nextPreview.oldSections[0]?.currency || 'VND'

  return nextPreview.currentSections.map((section) => {
    const suggestion = nextPreview.suggestions.find(item => item.venueSectionId === section.venueSectionId)
    const oldSection = suggestion?.sourceVenueSectionId === null || suggestion?.sourceVenueSectionId === undefined
      ? undefined
      : findOldSection(nextPreview, suggestion.sourceVenueSectionId)

    return {
      venueSectionId: section.venueSectionId,
      sourceValue: oldSection ? String(oldSection.venueSectionId) : NO_SOURCE_VALUE,
      priceCents: oldSection?.priceCents ?? 0,
      currency: oldSection?.currency ?? fallbackCurrency,
    }
  })
}

function findOldSection(nextPreview: VenueLayoutSyncPreview, venueSectionId: number) {
  return nextPreview.oldSections.find(section => section.venueSectionId === venueSectionId)
}

function getMapping(venueSectionId: number) {
  return mappings.value.find(mapping => mapping.venueSectionId === venueSectionId)
}

function getSuggestion(venueSectionId: number) {
  return preview.value?.suggestions.find(suggestion => suggestion.venueSectionId === venueSectionId)
}

function updateSource(venueSectionId: number, sourceValue: string) {
  const nextPreview = preview.value
  if (!nextPreview) {
    return
  }

  mappings.value = mappings.value.map((mapping) => {
    if (mapping.venueSectionId !== venueSectionId) {
      return mapping
    }

    const sourceId = parseSourceValue(sourceValue)
    if (sourceId === null) {
      return { ...mapping, sourceValue: NO_SOURCE_VALUE }
    }

    const oldSection = findOldSection(nextPreview, sourceId)
    if (!oldSection) {
      return { ...mapping, sourceValue: NO_SOURCE_VALUE }
    }

    return {
      ...mapping,
      sourceValue: String(oldSection.venueSectionId),
      priceCents: oldSection.priceCents,
      currency: oldSection.currency,
    }
  })
}

function updatePrice(venueSectionId: number, value: string | number) {
  const priceCents = parsePriceInputValue(value)
  mappings.value = mappings.value.map(mapping => mapping.venueSectionId === venueSectionId ? { ...mapping, priceCents } : mapping)
}

function updateCurrency(venueSectionId: number, value: string | number) {
  mappings.value = mappings.value.map(mapping => mapping.venueSectionId === venueSectionId ? { ...mapping, currency: String(value).trim().toUpperCase() } : mapping)
}

function parseSourceValue(value: string) {
  if (value === NO_SOURCE_VALUE) {
    return null
  }

  const sourceId = Number(value)
  if (!Number.isSafeInteger(sourceId) || sourceId <= 0) {
    return null
  }

  return sourceId
}

function formatPriceInputValue(priceCents: number) {
  return String(priceCents / 100)
}

function parsePriceInputValue(value: string | number) {
  const price = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(price) || price < 0) {
    return 0
  }

  return Math.round(price * 100)
}

function isValidMapping(mapping: EditableMapping | undefined) {
  return mapping !== undefined && Number.isSafeInteger(mapping.priceCents) && mapping.priceCents >= 0 && mapping.currency.trim().length > 0
}

function getSectionMeta(rowCount: number, seatCount: number) {
  return t('admin_event_sync.rows_seats', { rows: rowCount, seats: seatCount })
}

function getSuggestionLabel(venueSectionId: number) {
  const suggestion = getSuggestion(venueSectionId)
  if (!suggestion || suggestion.confidence === 'none') {
    return t('admin_event_sync.suggestion_none')
  }

  return t(`admin_event_sync.suggestion_${suggestion.confidence}`)
}

function getSuggestionReason(venueSectionId: number) {
  const suggestion = getSuggestion(venueSectionId)
  if (!suggestion) {
    return t('admin_event_sync.reason_new_section')
  }

  return t(`admin_event_sync.reason_${suggestion.reason.replaceAll('-', '_')}`)
}

function toApplyMapping(mapping: EditableMapping): VenueLayoutSyncApplyMapping {
  return {
    venueSectionId: mapping.venueSectionId,
    sourceVenueSectionId: parseSourceValue(mapping.sourceValue),
    priceCents: mapping.priceCents,
    currency: mapping.currency.trim().toUpperCase(),
  }
}

async function applyChanges() {
  if (!canApply.value || props.sessionId === null) {
    return
  }

  const applyingSessionId = props.sessionId
  const applyRequestId = previewRequestId
  const payload: VenueLayoutSyncApplyInput = { mappings: mappings.value.map(toApplyMapping) }

  isApplying.value = true
  applyError.value = ''

  try {
    await props.applySync(applyingSessionId, payload)
    if (!isCurrentApplyRequest(applyingSessionId, applyRequestId)) {
      return
    }

    emit('applied')
    emit('update:open', false)
  }
  catch (error) {
    if (!isCurrentApplyRequest(applyingSessionId, applyRequestId)) {
      return
    }

    applyError.value = getErrorMessage(error, t('admin_event_sync.apply_error'))
  }
  finally {
    if (isCurrentApplyRequest(applyingSessionId, applyRequestId)) {
      isApplying.value = false
    }
  }
}

function isCurrentApplyRequest(sessionId: number, requestId: number) {
  return props.open && props.sessionId === sessionId && previewRequestId === requestId
}

function handleOpenChange(value: boolean) {
  emit('update:open', value)
}

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) {
    return error.message
  }

  if (typeof error === 'object' && error !== null && 'message' in error) {
    const message = error.message
    if (typeof message === 'string' && message.length > 0) {
      return message
    }
  }

  return fallback
}
</script>

<template>
  <ResponsiveDialog
    :open="open"
    content-class="sm:max-w-6xl"
    @update:open="handleOpenChange"
  >
    <DialogHeader>
      <DialogTitle class="flex items-center gap-2">
        <RefreshCw class="size-5" />
        {{ $t('admin_event_sync.title') }}
      </DialogTitle>
      <DialogDescription>
        {{ $t('admin_event_sync.description', { session: sessionLabel || $t('admin_event_sync.this_session') }) }}
      </DialogDescription>
    </DialogHeader>

    <div class="space-y-4">
      <Alert
        v-if="loadError || applyError"
        variant="destructive"
      >
        <AlertTriangle class="size-4" />
        <AlertTitle>{{ $t('admin_event_sync.error_title') }}</AlertTitle>
        <AlertDescription>{{ loadError || applyError }}</AlertDescription>
      </Alert>

      <Alert v-if="preview?.clearsSeatOverrides">
        <AlertTriangle class="size-4" />
        <AlertTitle>{{ $t('admin_event_sync.clears_overrides_title') }}</AlertTitle>
        <AlertDescription>{{ $t('admin_event_sync.clears_overrides_warning') }}</AlertDescription>
      </Alert>

      <div
        v-if="isLoading"
        class="rounded-lg border border-dashed py-10 text-center text-sm text-muted-foreground"
      >
        {{ $t('admin_event_sync.loading') }}
      </div>

      <div
        v-else-if="preview && !preview.currentSections.length"
        class="rounded-lg border border-dashed py-10 text-center"
      >
        <p class="font-medium text-foreground">
          {{ $t('admin_event_sync.empty_title') }}
        </p>
        <p class="mt-1 text-sm text-muted-foreground">
          {{ $t('admin_event_sync.empty_description') }}
        </p>
      </div>

      <div
        v-else-if="preview"
        class="grid gap-4 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.4fr)]"
      >
        <section class="space-y-3 rounded-lg border bg-muted/20 p-4">
          <div>
            <h3 class="text-sm font-medium text-foreground">
              {{ $t('admin_event_sync.old_snapshot') }}
            </h3>
            <p class="text-sm text-muted-foreground">
              {{ $t('admin_event_sync.old_snapshot_desc') }}
            </p>
          </div>

          <div class="space-y-2">
            <div
              v-for="section in preview.oldSections"
              :key="section.venueSectionId"
              class="rounded-lg border bg-background p-3"
            >
              <div class="flex items-start justify-between gap-3">
                <div class="min-w-0 space-y-1">
                  <div class="flex items-center gap-2">
                    <span
                      class="size-3 rounded-full border border-background shadow-sm"
                      :style="{ backgroundColor: section.color }"
                    />
                    <p class="truncate text-sm font-medium text-foreground">
                      {{ section.name }}
                    </p>
                  </div>
                  <p class="text-xs text-muted-foreground">
                    {{ getSectionMeta(section.rowCount, section.seatCount) }}
                  </p>
                </div>
                <div class="shrink-0 text-right">
                  <p class="text-sm font-medium text-foreground">
                    {{ formatPriceInputValue(section.priceCents) }}
                  </p>
                  <p class="text-xs text-muted-foreground">
                    {{ section.currency }}
                  </p>
                </div>
              </div>
            </div>

            <p
              v-if="!preview.oldSections.length"
              class="rounded-lg border border-dashed bg-background p-4 text-sm text-muted-foreground"
            >
              {{ $t('admin_event_sync.no_old_sections') }}
            </p>
          </div>
        </section>

        <section class="space-y-3 rounded-lg border p-4">
          <div>
            <h3 class="text-sm font-medium text-foreground">
              {{ $t('admin_event_sync.current_layout') }}
            </h3>
            <p class="text-sm text-muted-foreground">
              {{ $t('admin_event_sync.current_layout_desc') }}
            </p>
          </div>

          <div class="space-y-3">
            <div
              v-for="section in preview.currentSections"
              :key="section.venueSectionId"
              class="rounded-lg border bg-background p-3"
            >
              <div class="grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(15rem,0.9fr)]">
                <div class="min-w-0 space-y-2">
                  <div class="flex flex-wrap items-center gap-2">
                    <span
                      class="size-3 rounded-full border border-background shadow-sm"
                      :style="{ backgroundColor: section.color }"
                    />
                    <p class="truncate text-sm font-medium text-foreground">
                      {{ section.name }}
                    </p>
                    <Badge
                      variant="secondary"
                      class="gap-1"
                    >
                      <Link2 class="size-3" />
                      {{ getSuggestionLabel(section.venueSectionId) }}
                    </Badge>
                  </div>
                  <p class="text-xs text-muted-foreground">
                    {{ getSectionMeta(section.rowCount, section.seatCount) }}
                  </p>
                  <p class="text-xs text-muted-foreground">
                    {{ getSuggestionReason(section.venueSectionId) }}
                  </p>
                </div>

                <div
                  v-if="getMapping(section.venueSectionId)"
                  class="grid gap-3 sm:grid-cols-2"
                >
                  <div class="space-y-1.5 sm:col-span-2">
                    <Label :for="`sync-section-${section.venueSectionId}-source`">
                      {{ $t('admin_event_sync.source_select') }}
                    </Label>
                    <Select
                      :model-value="getMapping(section.venueSectionId)?.sourceValue"
                      @update:model-value="value => updateSource(section.venueSectionId, String(value))"
                    >
                      <SelectTrigger :id="`sync-section-${section.venueSectionId}-source`">
                        <SelectValue :placeholder="$t('admin_event_sync.no_source')" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem :value="NO_SOURCE_VALUE">
                          {{ $t('admin_event_sync.no_source') }}
                        </SelectItem>
                        <SelectItem
                          v-for="oldSection in preview.oldSections"
                          :key="oldSection.venueSectionId"
                          :value="String(oldSection.venueSectionId)"
                        >
                          {{ oldSection.name }}
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div class="space-y-1.5">
                    <Label :for="`sync-section-${section.venueSectionId}-price`">
                      {{ $t('admin_event_sync.price') }}
                    </Label>
                    <Input
                      :id="`sync-section-${section.venueSectionId}-price`"
                      type="number"
                      min="0"
                      step="0.01"
                      :model-value="formatPriceInputValue(getMapping(section.venueSectionId)?.priceCents ?? 0)"
                      :aria-invalid="!isValidMapping(getMapping(section.venueSectionId))"
                      @update:model-value="value => updatePrice(section.venueSectionId, value)"
                    />
                  </div>

                  <div class="space-y-1.5">
                    <Label :for="`sync-section-${section.venueSectionId}-currency`">
                      {{ $t('admin_event_sync.currency') }}
                    </Label>
                    <Input
                      :id="`sync-section-${section.venueSectionId}-currency`"
                      maxlength="3"
                      :model-value="getMapping(section.venueSectionId)?.currency || firstCurrency"
                      :aria-invalid="!isValidMapping(getMapping(section.venueSectionId))"
                      @update:model-value="value => updateCurrency(section.venueSectionId, value)"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <p
            v-if="hasInvalidRows"
            class="text-sm text-destructive"
          >
            {{ $t('admin_event_sync.validation_error') }}
          </p>
        </section>
      </div>
    </div>

    <DialogFooter class="gap-2 sm:gap-0">
      <Button
        type="button"
        variant="outline"
        :disabled="isApplying"
        @click="emit('update:open', false)"
      >
        {{ $t('admin_event_sync.cancel') }}
      </Button>
      <Button
        type="button"
        :disabled="!canApply"
        :is-loading="isApplying"
        @click="applyChanges"
      >
        {{ $t('admin_event_sync.apply') }}
      </Button>
    </DialogFooter>
  </ResponsiveDialog>
</template>
