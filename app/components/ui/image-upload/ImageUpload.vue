<script setup lang="ts">
import { computed, onBeforeUnmount, ref, useAttrs, watch } from 'vue'
import { ImagePlus, Loader2, Trash2, UploadCloud } from '@lucide/vue'
import { toast } from 'vue-sonner'
import type { ApiResponse } from '~~/types/api'
import {
  IMAGE_UPLOAD_ACCEPT,
  IMAGE_UPLOAD_ALLOWED_TYPES_LABEL,
  IMAGE_UPLOAD_MAX_BYTES,
  IMAGE_UPLOAD_MAX_SIZE_LABEL,
  type ImageUploadKind,
  isAllowedImageUploadType,
} from '#shared/constants/imageUpload'
import { apiRoutes } from '#shared/apiRoutes'
import { apiRequest } from '@/utils/apiRequest'
import { parseApiError } from '@/utils/apiError'
import { cn } from '@/lib/utils'

defineOptions({
  inheritAttrs: false,
})

interface UploadedImagePayload {
  pathname: string
  url: string
}

const props = withDefaults(defineProps<{
  id: string
  modelValue?: string
  uploadKind: ImageUploadKind
  disabled?: boolean
}>(), {
  modelValue: '',
  disabled: false,
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
  blur: []
}>()

const attrs = useAttrs()
const { t } = useI18n()

const fileInputRef = ref<HTMLInputElement | null>(null)
const localPreviewUrl = ref<string | null>(null)
const fileName = ref('')
const isDragging = ref(false)
const isUploading = ref(false)
const uploadError = ref('')
let uploadRequestId = 0

const controlId = computed(() => props.id)
const dropzoneId = computed(() => `${props.id}-dropzone`)
const controlAttrs = computed(() => Object.fromEntries(Object.entries(attrs).filter(([key]) => key !== 'class')))
const previewUrl = computed(() => localPreviewUrl.value ?? props.modelValue)
const ariaInvalid = computed(() => attrs['aria-invalid'] === true || attrs['aria-invalid'] === 'true')
const isDisabled = computed(() => props.disabled || isUploading.value)

function clearLocalPreview() {
  if (localPreviewUrl.value) {
    URL.revokeObjectURL(localPreviewUrl.value)
    localPreviewUrl.value = null
  }
}

function setLocalPreview(file: File) {
  clearLocalPreview()
  localPreviewUrl.value = URL.createObjectURL(file)
  fileName.value = file.name
}

function resetFileInput() {
  if (fileInputRef.value) {
    fileInputRef.value.value = ''
  }
}

function triggerInput() {
  if (isDisabled.value) {
    return
  }

  fileInputRef.value?.click()
}

function getValidationError(file: File) {
  if (!isAllowedImageUploadType(file.type)) {
    return t('admin.image_upload.invalid_type', { types: IMAGE_UPLOAD_ALLOWED_TYPES_LABEL })
  }

  if (file.size > IMAGE_UPLOAD_MAX_BYTES) {
    return t('admin.image_upload.file_too_large', { maxSize: IMAGE_UPLOAD_MAX_SIZE_LABEL })
  }

  return ''
}

async function uploadFile(file: File) {
  const validationError = getValidationError(file)
  if (validationError) {
    uploadError.value = validationError
    toast.error(validationError)
    resetFileInput()
    return
  }

  const requestId = uploadRequestId + 1
  uploadRequestId = requestId
  const formData = new FormData()
  formData.append('files', file)
  setLocalPreview(file)
  uploadError.value = ''
  isUploading.value = true

  try {
    const response = await apiRequest<ApiResponse<UploadedImagePayload>>(apiRoutes.ADMIN_IMAGE_UPLOAD, {
      method: 'POST',
      query: { kind: props.uploadKind },
      body: formData,
    })

    if (requestId !== uploadRequestId) {
      return
    }

    if (!response.success) {
      uploadError.value = response.error.message
      toast.error(response.error.message)
      clearLocalPreview()
      fileName.value = ''
      return
    }

    emit('update:modelValue', response.data.url)
    uploadError.value = ''
  }
  catch (error: unknown) {
    if (requestId !== uploadRequestId) {
      return
    }

    const parsed = parseApiError(error, t('admin.image_upload.upload_failed'))
    uploadError.value = parsed.message
    toast.error(parsed.message)
    clearLocalPreview()
    fileName.value = ''
  }
  finally {
    if (requestId === uploadRequestId) {
      isUploading.value = false
    }
    resetFileInput()
  }
}

function getInputFile(event: Event) {
  const target = event.target
  if (!(target instanceof HTMLInputElement)) {
    return null
  }

  return target.files?.item(0) ?? null
}

function onFileInputChange(event: Event) {
  const file = getInputFile(event)
  if (!file) {
    return
  }

  void uploadFile(file)
}

function onDragEnter() {
  if (!isDisabled.value) {
    isDragging.value = true
  }
}

function onDragLeave() {
  isDragging.value = false
}

function onDrop(event: DragEvent) {
  isDragging.value = false
  if (isDisabled.value) {
    return
  }

  const file = event.dataTransfer?.files.item(0) ?? null
  if (!file) {
    return
  }

  void uploadFile(file)
}

function removeImage() {
  if (isDisabled.value) {
    return
  }

  clearLocalPreview()
  fileName.value = ''
  uploadError.value = ''
  emit('update:modelValue', '')
  resetFileInput()
}

watch(() => props.modelValue, () => {
  clearLocalPreview()
  if (!props.modelValue) {
    fileName.value = ''
  }
})

onBeforeUnmount(() => {
  clearLocalPreview()
})
</script>

<template>
  <div class="flex flex-col gap-3">
    <input
      :id="controlId"
      ref="fileInputRef"
      v-bind="controlAttrs"
      class="sr-only"
      type="file"
      :accept="IMAGE_UPLOAD_ACCEPT"
      :disabled="isDisabled"
      :aria-invalid="ariaInvalid"
      @change="onFileInputChange"
      @blur="emit('blur')"
    >

    <button
      v-if="!previewUrl"
      :id="dropzoneId"
      type="button"
      :disabled="isDisabled"
      :aria-invalid="ariaInvalid"
      :data-disabled="isDisabled ? '' : undefined"
      :class="cn(
        'flex min-h-44 cursor-pointer flex-col items-center justify-center gap-4 rounded-xl border border-dashed border-border bg-muted/30 p-6 text-center transition-colors hover:bg-muted/50 focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 sm:min-h-56 md:min-h-64',
        isDragging && 'border-primary bg-primary/5',
        ariaInvalid && 'border-destructive ring-destructive/20 ring-[3px]',
      )"
      @click="triggerInput"
      @dragover.prevent
      @dragenter.prevent="onDragEnter"
      @dragleave.prevent="onDragLeave"
      @drop.prevent="onDrop"
      @blur="emit('blur')"
    >
      <span class="rounded-full bg-background p-3 shadow-sm">
        <UploadCloud v-if="isUploading" class="size-6 animate-pulse text-muted-foreground" aria-hidden="true" />
        <ImagePlus v-else class="size-6 text-muted-foreground" aria-hidden="true" />
      </span>
      <span class="flex flex-col gap-1">
        <span class="text-sm font-medium">
          {{ isUploading ? t('admin.image_upload.uploading') : t('admin.image_upload.prompt') }}
        </span>
        <span class="text-xs text-muted-foreground">
          {{ t('admin.image_upload.drag_hint') }}
        </span>
        <span class="text-xs text-muted-foreground">
          {{ t('admin.image_upload.supported_formats', { maxSize: IMAGE_UPLOAD_MAX_SIZE_LABEL }) }}
        </span>
      </span>
    </button>

    <div v-else class="flex flex-col gap-2">
      <div
        :class="cn(
          'group relative h-44 overflow-hidden rounded-xl border bg-muted/30 transition-colors sm:h-56 md:h-64',
          isDragging && 'border-primary bg-primary/5 ring-primary/20 ring-[3px]',
          ariaInvalid && 'border-destructive ring-destructive/20 ring-[3px]',
        )"
        @dragover.prevent
        @dragenter.prevent="onDragEnter"
        @dragleave.prevent="onDragLeave"
        @drop.prevent="onDrop"
      >
        <img
          :src="previewUrl"
          :alt="fileName || t('admin.image_upload.preview_alt')"
          class="size-full object-cover transition-transform duration-300 group-hover:scale-105"
        >
        <div class="absolute inset-0 bg-black/40 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100" />
        <div class="absolute inset-0 flex items-center justify-center gap-2 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
          <Button
            type="button"
            size="icon-sm"
            variant="secondary"
            :disabled="isDisabled"
            :aria-label="t('admin.image_upload.replace')"
            @click.stop="triggerInput"
            @blur="emit('blur')"
          >
            <ImagePlus aria-hidden="true" />
          </Button>
          <Button
            type="button"
            size="icon-sm"
            variant="destructive"
            :disabled="isDisabled"
            :aria-label="t('admin.image_upload.remove')"
            @click.stop="removeImage"
            @blur="emit('blur')"
          >
            <Trash2 aria-hidden="true" />
          </Button>
        </div>

        <div
          v-if="isUploading"
          class="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-background/80 text-center backdrop-blur-sm"
          role="status"
          aria-live="polite"
        >
          <Loader2 class="size-7 animate-spin text-primary" aria-hidden="true" />
          <span class="text-sm font-medium text-foreground">
            {{ t('admin.image_upload.uploading') }}
          </span>
          <span class="text-xs text-muted-foreground">
            {{ t('admin.image_upload.supported_formats', { maxSize: IMAGE_UPLOAD_MAX_SIZE_LABEL }) }}
          </span>
        </div>
      </div>

      <div class="flex flex-col gap-3 sm:flex-row sm:items-center">
        <span class="truncate text-sm text-muted-foreground">
          {{ fileName || modelValue }}
        </span>
        <div class="flex flex-col gap-2 sm:ml-auto sm:flex-row">
          <Button
            type="button"
            size="sm"
            variant="outline"
            class="w-full sm:w-auto"
            :disabled="isDisabled"
            @click="triggerInput"
            @blur="emit('blur')"
          >
            <ImagePlus aria-hidden="true" />
            {{ t('admin.image_upload.replace') }}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="destructive"
            class="w-full sm:w-auto"
            :disabled="isDisabled"
            @click="removeImage"
            @blur="emit('blur')"
          >
            <Trash2 aria-hidden="true" />
            {{ t('admin.image_upload.remove') }}
          </Button>
        </div>
      </div>
    </div>

    <p v-if="uploadError" class="text-sm text-destructive" role="alert">
      {{ uploadError }}
    </p>
  </div>
</template>
