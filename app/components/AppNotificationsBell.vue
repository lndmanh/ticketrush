<script setup lang="ts">
import { Bell, CheckCircle2, Clock3, Ticket, WalletCards, XCircle } from '@lucide/vue'
import { getDisplayDateLocale, getLocalizedEventTitle } from '@/lib/localizedEvents'

type NotificationSeverity = 'success' | 'warning' | 'info' | 'error'

interface AppNotification {
  id: string
  kind: 'hold' | 'payment' | 'event' | 'failed'
  severity: NotificationSeverity
  titleKey: string
  descriptionKey: string
  descriptionParams: Record<string, string | number>
  href: string | null
  createdAt: string | Date
  expiresAt: string | Date | null
}

const { data, refresh } = await useAPI('/api/notifications')
const { t, locale } = useI18n()
const localePath = useLocalePath()
const NOTIFICATION_READ_STORAGE_KEY = 'ticketrush:read-notifications'

const notifications = computed<AppNotification[]>(() => data.value?.success ? data.value.data.notifications : [])
const isOpen = ref(false)
const readNotificationIds = ref<string[]>([])
const unreadCount = computed(() => notifications.value.filter(notification => !readNotificationIds.value.includes(notification.id)).length)

const severityClass: Record<NotificationSeverity, string> = {
  success: 'border-emerald-500/25 bg-emerald-500/10 text-emerald-600 dark:text-emerald-300',
  warning: 'border-amber-500/25 bg-amber-500/10 text-amber-600 dark:text-amber-300',
  info: 'border-primary/25 bg-primary/10 text-primary',
  error: 'border-rose-500/25 bg-rose-500/10 text-rose-600 dark:text-rose-300',
}

function getIcon(kind: AppNotification['kind']) {
  if (kind === 'hold') {
    return Clock3
  }

  if (kind === 'payment') {
    return CheckCircle2
  }

  if (kind === 'failed') {
    return XCircle
  }

  return Ticket
}

function getTimeLabel(value: string | Date) {
  return new Date(value).toLocaleString(getDisplayDateLocale(locale.value), {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

function getExpiryLabel(value: string | Date | null) {
  if (!value) {
    return null
  }

  const ms = new Date(value).getTime() - Date.now()
  if (ms <= 0) {
    return t('notifications.expired')
  }

  const minutes = Math.max(1, Math.ceil(ms / 60000))
  return t('notifications.expires_in_min', { count: minutes })
}

function openNotification(notification: AppNotification) {
  markNotificationsRead([notification.id])

  if (!notification.href) {
    return
  }

  void navigateTo(localePath(notification.href))
}

function persistReadNotificationIds(ids: string[]) {
  if (!import.meta.client) {
    return
  }

  window.localStorage.setItem(NOTIFICATION_READ_STORAGE_KEY, JSON.stringify(ids))
}

function markNotificationsRead(ids: string[]) {
  if (ids.length === 0) {
    return
  }

  const nextIds = Array.from(new Set([...readNotificationIds.value, ...ids]))
  readNotificationIds.value = nextIds
  persistReadNotificationIds(nextIds)
}

function loadReadNotificationIds() {
  if (!import.meta.client) {
    return
  }

  const rawValue = window.localStorage.getItem(NOTIFICATION_READ_STORAGE_KEY)
  if (!rawValue) {
    return
  }

  try {
    const parsed = JSON.parse(rawValue)
    if (Array.isArray(parsed)) {
      readNotificationIds.value = parsed.filter((id): id is string => typeof id === 'string')
    }
  }
  catch {
    window.localStorage.removeItem(NOTIFICATION_READ_STORAGE_KEY)
  }
}

function getLocalizedDescriptionParams(params: AppNotification['descriptionParams']) {
  if (typeof params.event !== 'string') {
    return params
  }

  return {
    ...params,
    event: getLocalizedEventTitle(params.event, locale.value) ?? params.event,
  }
}

let refreshIntervalId: number | null = null

onMounted(() => {
  loadReadNotificationIds()
  refreshIntervalId = window.setInterval(() => {
    void refresh()
  }, 30000)
})

watch(isOpen, (open) => {
  if (open) {
    markNotificationsRead(notifications.value.map(notification => notification.id))
  }
})

onUnmounted(() => {
  if (refreshIntervalId !== null) {
    window.clearInterval(refreshIntervalId)
  }
})
</script>

<template>
  <DropdownMenu v-model:open="isOpen">
    <DropdownMenuTrigger as-child>
      <Button
        variant="ghost"
        size="icon"
        class="relative size-9 rounded-full"
        :aria-label="t('notifications.open')"
      >
        <Bell class="size-4" />
        <span
          v-if="unreadCount > 0"
          class="absolute -right-0.5 -top-0.5 flex min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold leading-4 text-primary-foreground"
        >
          {{ unreadCount > 9 ? '9+' : unreadCount }}
        </span>
      </Button>
    </DropdownMenuTrigger>
    <DropdownMenuContent
      align="end"
      class="w-[min(24rem,calc(100vw-2rem))] p-0"
    >
      <div class="border-b p-4">
        <div class="flex items-center justify-between gap-3">
          <div>
            <p class="font-semibold tracking-[-0.03em] text-foreground">
              {{ $t('notifications.title') }}
            </p>
            <p class="mt-1 text-xs text-muted-foreground">
              {{ $t('notifications.subtitle') }}
            </p>
          </div>
          <WalletCards class="size-4 text-muted-foreground" />
        </div>
      </div>

      <div class="max-h-[28rem] overflow-y-auto p-2">
        <button
          v-for="notification in notifications"
          :key="notification.id"
          type="button"
          class="flex w-full gap-3 rounded-xl p-3 text-left transition-colors hover:bg-muted/60"
          :class="readNotificationIds.includes(notification.id) ? 'opacity-70' : ''"
          @click="openNotification(notification)"
        >
          <span :class="['mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full border', severityClass[notification.severity]]">
            <component
              :is="getIcon(notification.kind)"
              class="size-4"
            />
          </span>
          <span class="min-w-0 flex-1">
            <span class="block text-sm font-medium text-foreground">
              {{ $t(notification.titleKey, getLocalizedDescriptionParams(notification.descriptionParams)) }}
            </span>
            <span class="mt-1 block text-sm leading-5 text-muted-foreground">
              {{ $t(notification.descriptionKey, getLocalizedDescriptionParams(notification.descriptionParams)) }}
            </span>
            <span class="mt-2 flex flex-wrap gap-2 text-[11px] text-muted-foreground">
              <span>{{ getTimeLabel(notification.createdAt) }}</span>
              <span v-if="getExpiryLabel(notification.expiresAt)">· {{ getExpiryLabel(notification.expiresAt) }}</span>
            </span>
          </span>
        </button>

        <div
          v-if="notifications.length === 0"
          class="p-8 text-center"
        >
          <div class="mx-auto flex size-12 items-center justify-center rounded-full border bg-muted/30">
            <Bell class="size-5 text-muted-foreground" />
          </div>
          <p class="mt-3 text-sm font-medium text-foreground">
            {{ $t('notifications.empty_title') }}
          </p>
          <p class="mt-1 text-xs leading-5 text-muted-foreground">
            {{ $t('notifications.empty_desc') }}
          </p>
        </div>
      </div>
    </DropdownMenuContent>
  </DropdownMenu>
</template>
