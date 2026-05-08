import { success } from '~~/server/utils/apiResponse'

export default defineEventHandler(async () => {
  const response: { status: string, timestamp: number } = {
    status: 'ok',
    timestamp: Date.now(),
  }

  return success(response)
})
