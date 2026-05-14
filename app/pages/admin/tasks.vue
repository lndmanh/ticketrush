<script setup lang="ts">
import { toast } from 'vue-sonner'
import { Clock, Database, Loader2, Play, Users } from '@lucide/vue'
import type { ApiResponse } from '~~/types/api'
import type { AdminTaskData, AdminTaskResult } from '~~/types/admin-tasks'
import { apiRequest } from '@/utils/apiRequest'
import { parseApiError } from '@/utils/apiError'
import { getUiFallbackText } from '@/utils/uiText'
import { getDisplayDateLocale } from '@/lib/localizedEvents'

interface TaskDefinition {
  id: string
  titleKey: string
  descriptionKey: string
  endpoint: string
  icon: typeof Play
  variant: 'default' | 'secondary' | 'outline'
}

interface ResultSummaryItem {
  label: string
  value: string
}

const tasks: TaskDefinition[] = [
  {
    id: 'release-holds',
    titleKey: 'admin.tasks.release_holds_title',
    descriptionKey: 'admin.tasks.release_holds_desc',
    endpoint: '/api/admin/tasks/release-holds',
    icon: Clock,
    variant: 'default',
  },
  {
    id: 'admit-queue',
    titleKey: 'admin.tasks.admit_queue_title',
    descriptionKey: 'admin.tasks.admit_queue_desc',
    endpoint: '/api/admin/tasks/admit-queue',
    icon: Users,
    variant: 'default',
  },
  {
    id: 'seed-admin',
    titleKey: 'admin.tasks.seed_admin_title',
    descriptionKey: 'admin.tasks.seed_admin_desc',
    endpoint: '/api/admin/tasks/seed-admin',
    icon: Database,
    variant: 'secondary',
  },
  {
    id: 'reseed-events',
    titleKey: 'admin.tasks.reseed_events_title',
    descriptionKey: 'admin.tasks.reseed_events_desc',
    endpoint: '/api/admin/tasks/reseed-events',
    icon: Database,
    variant: 'outline',
  },
]

const runningTasks = ref<Set<string>>(new Set())
const taskResults = ref<Record<string, AdminTaskResult>>({})
const { locale, t } = useI18n()

function tx(key: string) {
  const translated = t(key)
  return translated === key ? getUiFallbackText(key) : translated
}

function txParams(key: string, params: Record<string, string | number>) {
  const translated = t(key, params)
  if (translated !== key) {
    return translated
  }

  return Object.entries(params).reduce(
    (message, [paramKey, paramValue]) => message.replaceAll(`{${paramKey}}`, String(paramValue)),
    getUiFallbackText(key),
  )
}

function getTaskTitle(task: TaskDefinition) {
  return tx(task.titleKey)
}

function formatRanAt() {
  return new Date().toLocaleTimeString(getDisplayDateLocale(locale.value), {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

const localizedTasks = computed(() => tasks.map(task => ({
  ...task,
  title: tx(task.titleKey),
  description: tx(task.descriptionKey),
})))

function getTaskResultMessage(taskId: string, data: AdminTaskData) {
  if (taskId === 'release-holds' && 'releasedCount' in data) {
    return data.releasedCount > 0
      ? txParams('admin.tasks.result_release_holds_done', { count: data.releasedCount })
      : tx('admin.tasks.result_release_holds_empty')
  }

  if (taskId === 'admit-queue' && 'admissionSummary' in data) {
    const admittedTotal = data.admissionSummary.reduce((total, item) => total + item.admittedCount, 0)
    return admittedTotal > 0
      ? txParams('admin.tasks.result_admit_queue_done', { count: admittedTotal })
      : tx('admin.tasks.result_admit_queue_empty')
  }

  if (taskId === 'seed-admin' && 'admin' in data) {
    return data.admin.isAdmin
      ? txParams('admin.tasks.result_seed_admin_ready', { username: data.admin.username })
      : txParams('admin.tasks.result_seed_admin_checked', { username: data.admin.username })
  }

  if (taskId === 'reseed-events' && 'eventsCreated' in data) {
    return txParams('admin.tasks.result_reseed_events_done', { count: data.eventsCreated })
  }

  return tx('admin.tasks.result_completed')
}

function getTaskResultSummary(taskId: string, data: AdminTaskData): ResultSummaryItem[] {
  if (taskId === 'release-holds' && 'releasedCount' in data) {
    return [
      { label: tx('admin.tasks.metric_released_tickets'), value: String(data.releasedCount) },
      { label: tx('admin.tasks.metric_events_updated'), value: String(data.eventsRecomputed) },
    ]
  }

  if (taskId === 'admit-queue' && 'admissionSummary' in data) {
    const admittedTotal = data.admissionSummary.reduce((total, item) => total + item.admittedCount, 0)
    const activeSessions = data.admissionSummary.filter(item => item.admittedCount > 0).length
    return [
      { label: tx('admin.tasks.metric_admitted'), value: String(admittedTotal) },
      { label: tx('admin.tasks.metric_changed_sessions'), value: String(activeSessions) },
      { label: tx('admin.tasks.metric_expired_holds'), value: String(data.expiredCount) },
    ]
  }

  if (taskId === 'seed-admin' && 'admin' in data) {
    return [
      { label: tx('admin.tasks.metric_account'), value: data.admin.username },
      { label: tx('admin.tasks.metric_display_name'), value: data.admin.name ?? tx('common.not_set') },
      { label: tx('admin.tasks.metric_admin_role'), value: data.admin.isAdmin ? tx('admin.tasks.enabled') : tx('admin.tasks.disabled') },
    ]
  }

  if (taskId === 'reseed-events' && 'eventsCreated' in data) {
    return [
      { label: tx('admin.tasks.metric_created_events'), value: String(data.eventsCreated) },
      { label: tx('admin.tasks.metric_venues'), value: String(data.venuesCreated) },
      { label: tx('admin.tasks.metric_cities'), value: String(data.cities.length) },
    ]
  }

  return []
}

async function runTask(task: TaskDefinition) {
  if (runningTasks.value.has(task.id)) return

  runningTasks.value.add(task.id)
  try {
    const response = await apiRequest<ApiResponse<AdminTaskData>>(task.endpoint, { method: 'POST' })
    if (!response.success) {
      throw response
    }

    taskResults.value[task.id] = {
      success: true,
      data: response.data,
      ranAt: formatRanAt(),
    }
    toast.success(txParams('admin.tasks.completed', { title: getTaskTitle(task) }))
  }
  catch (err) {
    const message = parseApiError(err, tx('admin.tasks.failed')).message
    taskResults.value[task.id] = {
      success: false,
      error: message,
      ranAt: formatRanAt(),
    }
    toast.error(txParams('admin.tasks.task_failed', { title: getTaskTitle(task), message }))
  }
  finally {
    runningTasks.value.delete(task.id)
  }
}

definePageMeta({
  title: 'admin.tasks.title',
  breadcrumb: 'admin.tasks.title',
  middleware: ['auth', 'admin'],
  layout: 'dashboard',
})
</script>

<template>
  <div class="space-y-6">
    <div class="space-y-1">
      <h1 class="text-2xl font-semibold text-foreground">
        {{ tx('admin.tasks.title') }}
      </h1>
      <p class="text-sm text-muted-foreground">
        {{ tx('admin.tasks.desc') }}
      </p>
    </div>

    <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      <Card
        v-for="task in localizedTasks"
        :key="task.id"
        class="flex min-h-[20rem] flex-col"
      >
        <CardHeader>
          <div class="flex items-center gap-3">
            <div class="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted">
              <component
                :is="task.icon"
                class="size-4 text-muted-foreground"
              />
            </div>
            <div class="min-w-0 flex-1">
              <CardTitle class="text-sm leading-5 break-words">
                {{ task.title }}
              </CardTitle>
            </div>
          </div>
          <CardDescription class="text-xs break-words">
            {{ task.description }}
          </CardDescription>
        </CardHeader>

        <CardContent class="mt-auto space-y-3">
          <div
            v-if="taskResults[task.id]"
            class="rounded-xl border p-3 text-xs shadow-inner"
            :class="taskResults[task.id]?.success ? 'border-emerald-500/25 bg-emerald-500/5 text-emerald-700 shadow-emerald-950/10 dark:text-emerald-400' : 'border-destructive/25 bg-destructive/5 text-destructive shadow-destructive/10'"
          >
            <div class="flex items-center justify-between gap-3">
              <p class="font-semibold">
                {{ taskResults[task.id]?.success ? tx('admin.tasks.success') : tx('admin.tasks.failed') }}
              </p>
              <span class="shrink-0 text-[11px] font-normal text-muted-foreground">{{ tx('admin.tasks.at') }} {{ taskResults[task.id]?.ranAt }}</span>
            </div>

            <div
              v-if="taskResults[task.id]?.data"
              class="mt-3 space-y-3"
            >
              <p class="leading-5 text-foreground">
                {{ getTaskResultMessage(task.id, taskResults[task.id].data) }}
              </p>

              <div class="grid gap-2 sm:grid-cols-2">
                <div
                  v-for="item in getTaskResultSummary(task.id, taskResults[task.id].data)"
                  :key="item.label"
                  class="rounded-lg border border-current/10 bg-background/70 px-3 py-2"
                >
                  <p class="text-[11px] text-muted-foreground">
                    {{ item.label }}
                  </p>
                  <p class="mt-1 truncate text-sm font-semibold text-foreground">
                    {{ item.value }}
                  </p>
                </div>
              </div>

              <details class="rounded-lg border border-current/10 bg-background/50">
                <summary class="cursor-pointer px-3 py-2 text-[11px] font-medium text-muted-foreground hover:text-foreground">
                  {{ tx('admin.tasks.technical_details') }}
                </summary>
                <pre class="max-h-32 overflow-auto whitespace-pre-wrap break-words border-t border-current/10 px-3 py-2 font-mono text-[11px] leading-5 text-muted-foreground [scrollbar-color:hsl(var(--muted-foreground)/0.35)_transparent] [scrollbar-width:thin]">{{ JSON.stringify(taskResults[task.id]?.data, null, 2) }}</pre>
              </details>
            </div>

            <p
              v-if="taskResults[task.id]?.error"
              class="mt-3 max-h-28 overflow-auto rounded-lg border border-current/10 bg-background/70 px-3 py-2 leading-5 text-foreground [scrollbar-color:hsl(var(--muted-foreground)/0.35)_transparent] [scrollbar-width:thin]"
            >
              {{ taskResults[task.id]?.error }}
            </p>
          </div>

          <Button
            class="w-full"
            :variant="task.variant"
            :disabled="runningTasks.has(task.id)"
            @click="runTask(task)"
          >
            <Loader2
              v-if="runningTasks.has(task.id)"
              class="size-4 animate-spin"
            />
            <Play
              v-else
              class="size-4"
            />
            {{ runningTasks.has(task.id) ? tx('admin.tasks.running') : tx('admin.tasks.run') }}
          </Button>
        </CardContent>
      </Card>
    </div>
  </div>
</template>
