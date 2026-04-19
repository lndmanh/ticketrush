<script setup lang="ts">
import * as Sentry from '@sentry/nuxt'
import { BookOpenIcon, ExternalLinkIcon } from '@lucide/vue'

class SentryExampleFrontendError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'SentryExampleFrontendError'
  }
}

const hasSentError = ref(false)
const isConnected = ref<boolean | null>(null)
const isLoading = ref(false)

onMounted(async () => {
  try {
    const result = await Sentry.diagnoseSdkConnectivity()
    isConnected.value = result === 'sentry-unreachable' ? false : true
  }
  catch {
    isConnected.value = false
  }
})

async function getSentryData() {
  isLoading.value = true
  try {
    throw new SentryExampleFrontendError('This error is raised on the frontend of the example page.')
  }
  finally {
    isLoading.value = false
  }
}

definePageMeta({
  title: 'Test Sentry Integration',
  breadcrumb: 'Test Sentry',
  layout: 'dashboard',
  middleware: ['auth', 'admin'],
})
</script>

<template>
  <div>
    <Card>
      <CardHeader class="text-center space-y-4 pb-2">
        <!-- Sentry Logo with glow effect -->
        <div class="flex justify-center">
          <div class="relative">
            <div class="absolute inset-0 bg-violet-500/20 blur-xl rounded-full" />
            <svg
              height="56"
              width="56"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              class="relative text-violet-500"
            >
              <path
                d="M21.85 2.995a3.698 3.698 0 0 1 1.353 1.354l16.303 28.278a3.703 3.703 0 0 1-1.354 5.053 3.694 3.694 0 0 1-1.848.496h-3.828a31.149 31.149 0 0 0 0-3.09h3.815a.61.61 0 0 0 .537-.917L20.523 5.893a.61.61 0 0 0-1.057 0l-3.739 6.494a28.948 28.948 0 0 1 9.63 10.453 28.988 28.988 0 0 1 3.499 13.78v1.542h-9.852v-1.544a19.106 19.106 0 0 0-2.182-8.85 19.08 19.08 0 0 0-6.032-6.829l-1.85 3.208a15.377 15.377 0 0 1 6.382 12.484v1.542H3.696A3.694 3.694 0 0 1 0 34.473c0-.648.17-1.286.494-1.849l2.33-4.074a8.562 8.562 0 0 1 2.689 1.536L3.158 34.17a.611.611 0 0 0 .538.917h8.448a12.481 12.481 0 0 0-6.037-9.09l-1.344-.772 4.908-8.545 1.344.77a22.16 22.16 0 0 1 7.705 7.444 22.193 22.193 0 0 1 3.316 10.193h3.699a25.892 25.892 0 0 0-3.811-12.033 25.856 25.856 0 0 0-9.046-8.796l-1.344-.772 5.269-9.136a3.698 3.698 0 0 1 3.2-1.849c.648 0 1.285.17 1.847.495Z"
                fill="currentColor"
              />
            </svg>
          </div>
        </div>

        <div class="space-y-2">
          <CardTitle class="text-2xl font-bold tracking-tight">
            Sentry Test Page
          </CardTitle>
          <CardDescription class="text-base">
            Test your Sentry integration by throwing a sample error
          </CardDescription>
        </div>

        <!-- Connection Status Badge -->
        <div class="flex justify-center pt-2">
          <Badge
            v-if="isConnected === null"
            variant="secondary"
            class="gap-1.5 px-3 py-1"
          >
            <span class="size-2 rounded-full bg-muted-foreground animate-pulse" />
            Checking connection...
          </Badge>
          <Badge
            v-else-if="isConnected"
            variant="secondary"
            class="gap-1.5 px-3 py-1 bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
          >
            <span class="size-2 rounded-full bg-emerald-500" />
            Connected to Sentry
          </Badge>
          <Badge
            v-else
            variant="destructive"
            class="gap-1.5 px-3 py-1"
          >
            <span class="size-2 rounded-full bg-destructive-foreground" />
            Connection Failed
          </Badge>
        </div>
      </CardHeader>

      <CardContent class="space-y-4">
        <!-- Error Alert -->
        <Alert
          v-if="isConnected === false"
          variant="destructive"
          class="border-destructive/30 bg-destructive/5"
        >
          <AlertTitle>Connection Blocked</AlertTitle>
          <AlertDescription>
            Network requests to Sentry are being blocked. This may be caused by an ad-blocker or firewall. Disable it to complete the test.
          </AlertDescription>
        </Alert>

        <!-- Success Alert -->
        <Alert
          v-if="hasSentError"
          class="border-emerald-500/30 bg-emerald-500/5"
        >
          <AlertTitle class="text-emerald-500">
            Error Sent Successfully
          </AlertTitle>
          <AlertDescription class="text-emerald-500/80">
            The sample error has been sent to Sentry. Check your dashboard to view it.
          </AlertDescription>
        </Alert>

        <!-- Action Button -->
        <Button
          class="w-full h-12 text-base font-semibold gap-2 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
          :disabled="!isConnected || isLoading"
          @click="getSentryData"
        >
          {{ isLoading ? 'Sending Error...' : 'Throw Sample Error' }}
        </Button>
      </CardContent>

      <CardFooter class="flex-col gap-3 pt-2 pb-6">
        <Separator />
        <div class="flex gap-4 text-sm text-muted-foreground">
          <nuxt-link
            href="https://no-name-studio.sentry.io/issues/?project=4510474857349120"
            target="_blank"
            class="inline-flex items-center gap-1.5 hover:text-foreground transition-colors"
          >

            <ExternalLinkIcon
              class="size-3.5"
            />
            View Issues
          </nuxt-link>
          <nuxt-link
            href="https://docs.sentry.io/platforms/javascript/guides/nuxt/"
            target="_blank"
            class="inline-flex items-center gap-1.5 hover:text-foreground transition-colors"
          >
            <BookOpenIcon
              class="size-3.5"
            />
            Documentation
          </nuxt-link>
        </div>
      </CardFooter>
    </Card>
  </div>
</template>
