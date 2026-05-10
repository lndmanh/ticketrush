export async function verifyTurnstileTokenWithDevBypass(token: string) {
  const runtimeConfig = useRuntimeConfig()
  const hasSecret = Boolean(runtimeConfig.turnstile?.secretKey)

  if (import.meta.dev && !hasSecret) {
    return { success: true }
  }

  return verifyTurnstileToken(token)
}
