<script setup lang="ts">
import { toast } from 'vue-sonner'
import { Clock, Database, Loader2, Play, Users } from '@lucide/vue'
import type { ApiResponse } from '~~/types/api'
import type { AdminTaskData, AdminTaskResult } from '~~/types/admin-tasks'
import { apiRequest } from '@/utils/apiRequest'
import { parseApiError } from '@/utils/apiError'
import { getDisplayDateLocale } from '@/lib/localizedEvents'
import { formatTime } from '@/lib/utils'

interface TaskDefinition {
  id: string
  titleKey: string
  descriptionKey: string
  endpoint: string
  icon: typeof Play
  variant: 'default' | 'secondary' | 'outline'
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
]

const runningTasks = ref<Set<string>>(new Set())
const taskResults = ref<Record<string, AdminTaskResult>>({})
const { locale, t } = useI18n()

function formatRanAt() {
  return formatTime(new Date(), getDisplayDateLocale(locale.value), {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

const localizedTasks = computed(() => tasks.map(task => ({
  ...task,
  title: t(task.titleKey),
  description: t(task.descriptionKey),
})))

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
    toast.success(t('admin.tasks.completed', { title: task.title }))
  }
  catch (err) {
    const message = parseApiError(err, 'Task failed').message
    taskResults.value[task.id] = {
      success: false,
      error: message,
      ranAt: formatRanAt(),
    }
    toast.error(t('admin.tasks.task_failed', { title: task.title, message }))
  }
  finally {
    runningTasks.value.delete(task.id)
  }
}

definePageMeta({
  title: 'admin.tasks_title',
  breadcrumb: 'admin.tasks_breadcrumb',
  middleware: ['auth', 'admin'],
  layout: 'dashboard',
})

useSeo({
  title: computed(() => t('admin.tasks.title')),
  description: computed(() => t('admin.tasks.desc')),
  type: 'website',
})
</script>

<template>
  <div class="space-y-6">
    <div class="space-y-1">
      <h1 class="text-2xl font-semibold text-foreground">
        {{ $t('admin.tasks.title') }}
      </h1>
      <p class="text-sm text-muted-foreground">
        {{ $t('admin.tasks.desc') }}
      </p>
    </div>

    <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      <Card
        v-for="task in localizedTasks"
        :key="task.id"
        class="flex flex-col"
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
              <CardTitle class="text-sm">
                {{ task.title }}
              </CardTitle>
            </div>
          </div>
          <CardDescription class="text-xs">
            {{ task.description }}
          </CardDescription>
        </CardHeader>

        <CardContent class="mt-auto space-y-3">
          <div
            v-if="taskResults[task.id]"
            class="rounded-md border px-3 py-2 text-xs"
            :class="taskResults[task.id]?.success ? 'border-emerald-500/20 bg-emerald-500/5 text-emerald-700 dark:text-emerald-400' : 'border-destructive/20 bg-destructive/5 text-destructive'"
          >
            <p class="font-medium">
              {{ taskResults[task.id]?.success ? $t('admin.tasks.success') : $t('admin.tasks.failed') }}
              <span class="ml-1 font-normal text-muted-foreground">{{ $t('admin.tasks.at') }} {{ taskResults[task.id]?.ranAt }}</span>
            </p>
            <pre
              v-if="taskResults[task.id]?.data"
              class="mt-1 whitespace-pre-wrap break-all font-mono"
            >{{ JSON.stringify(taskResults[task.id]?.data, null, 2) }}</pre>
            <p v-if="taskResults[task.id]?.error">
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
            {{ runningTasks.has(task.id) ? $t('admin.tasks.running') : $t('admin.tasks.run') }}
          </Button>
        </CardContent>
      </Card>
    </div>
  </div>
</template>
