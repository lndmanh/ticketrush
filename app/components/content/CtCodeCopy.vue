<template>
  <Button
    ref="checkIconRef"
    variant="outline"
    class="size-7 p-1"
    @click="handleClick"
  >
    <Transition
      name="fade"
      mode="out-in"
    >
      <ClipboardCopyIcon
        v-if="copied === false"
        class="text-muted-foreground cursor-pointer"
      />
      <CheckIcon
        v-else
        class="text-muted-foreground cursor-pointer self-center"
      />
    </Transition>
  </Button>
</template>

<script setup lang="ts">
import { toast } from 'vue-sonner'
import { ClipboardCopyIcon, CheckIcon } from '@lucide/vue'

const { code } = defineProps<{
  code: string
}>()

const { t } = useI18n()

const { copy } = useClipboard({ source: code, legacy: true })
const copied = ref(false)

async function handleClick() {
  await copy(code.replaceAll(/\s*\/\/\s*\[!code (focus|\+\+|--|error|warning)\]/g, ''))
  copied.value = true

  if (useConfig().value.main.codeCopyToast) {
    toast({
      description: t(useConfig().value.main.codeCopyToastText),
    })
  }
}

const checkIconRef = useTemplateRef('checkIconRef')
onClickOutside(checkIconRef, () => {
  copied.value = false
})
</script>
