<script setup lang="ts">
import { toast } from 'vue-sonner'
import { Clock, Database, Loader2, Play, Users } from '@lucide/vue'

interface TaskDefinition {
  id: string
  title: string
  description: string
  endpoint: string
  icon: typeof Play
  variant: 'default' | 'secondary' | 'outline'
}

const tasks: TaskDefinition[] = [
  {
    id: 'release-holds',
    title: 'Release expired holds',
    description: 'Free seats from expired hold timers and recompute analytics for all events.',
    endpoint: '/api/admin/tasks/release-holds',
    icon: Clock,
    variant: 'default',
  },
  {
    id: 'admit-queue',
    title: 'Admit queue batch',
    description: 'Process the next admission batch for all queue-enabled events and expire stale entries.',
    endpoint: '/api/admin/tasks/admit-queue',
    icon: Users,
    variant: 'default',
  },
  {
    id: 'seed-admin',
    title: 'Seed admin account',
    description: 'Create the default administrator account if it does not already exist.',
    endpoint: '/api/admin/tasks/seed-admin',
    icon: Database,
    variant: 'secondary',
  },
]

const runningTasks = ref<Set<string>>(new Set())
const taskResults = ref<Record<string, { success: boolean, data?: any, error?: string, ranAt: string }>>({})

async function runTask(task: TaskDefinition) {
  if (runningTasks.value.has(task.id)) return

  runningTasks.value.add(task.id)
  try {
    const response = await $fetch<{ success: boolean, data: any }>(task.endpoint, { method: 'POST' })
    taskResults.value[task.id] = {
      success: true,
      data: response.data,
      ranAt: new Date().toLocaleTimeString(),
    }
    toast.success(`${task.title} completed`)
  }
  catch (err: any) {
    const message = err?.data?.message || err?.statusMessage || 'Task failed'
    taskResults.value[task.id] = {
      success: false,
      error: message,
      ranAt: new Date().toLocaleTimeString(),
    }
    toast.error(`${task.title} failed: ${message}`)
  }
  finally {
    runningTasks.value.delete(task.id)
  }
}

definePageMeta({
  title: 'Tasks',
  breadcrumb: 'Tasks',
  middleware: ['auth', 'admin'],
  layout: 'dashboard',
})
</script>

<template>
  <div class="space-y-6">
    <div class="space-y-1">
      <h1 class="text-2xl font-semibold text-foreground">
        Background tasks
      </h1>
      <p class="text-sm text-muted-foreground">
        Manually trigger system tasks that cannot run on a schedule in production.
      </p>
    </div>

    <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      <Card
        v-for="task in tasks"
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
            :class="taskResults[task.id]!.success ? 'border-emerald-500/20 bg-emerald-500/5 text-emerald-700 dark:text-emerald-400' : 'border-destructive/20 bg-destructive/5 text-destructive'"
          >
            <p class="font-medium">
              {{ taskResults[task.id]!.success ? 'Success' : 'Failed' }}
              <span class="ml-1 font-normal text-muted-foreground">at {{ taskResults[task.id]!.ranAt }}</span>
            </p>
            <pre
              v-if="taskResults[task.id]!.data"
              class="mt-1 whitespace-pre-wrap break-all font-mono"
            >{{ JSON.stringify(taskResults[task.id]!.data, null, 2) }}</pre>
            <p v-if="taskResults[task.id]!.error">
              {{ taskResults[task.id]!.error }}
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
            {{ runningTasks.has(task.id) ? 'Running...' : 'Run task' }}
          </Button>
        </CardContent>
      </Card>
    </div>
  </div>
</template>
