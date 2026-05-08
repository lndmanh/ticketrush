import * as Sentry from '@sentry/nuxt'

type ReportServerErrorContext = {
  code?: string
  status?: number
  statusText?: string
  message?: string
  extra?: Record<string, unknown>
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value)
}

export function reportServerError(error: unknown, context: ReportServerErrorContext = {}) {
  try {
    Sentry.withScope((scope) => {
      if (context.code) scope.setTag('api.error.code', context.code)
      if (context.status !== undefined) scope.setTag('api.error.status', String(context.status))
      if (context.statusText) scope.setTag('api.error.statusText', context.statusText)
      if (context.message) scope.setContext('api.error', { message: context.message })
      if (context.extra && isRecord(context.extra)) scope.setContext('api.extra', context.extra)
      Sentry.captureException(error)
    })
  }
  catch {
    // Swallow reporting failures.
  }
}
