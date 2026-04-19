export default defineEventHandler(async () => {
  return {
    status: 'ok',
    timestamp: Date.now(),
  }
})
