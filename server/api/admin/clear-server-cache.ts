import { useKV } from '~~/server/utils/kv'

export default defineEventHandler(async () => {
  const cache = useKV()
  await cache.clear()
  await useStorage('cache').clear()

  return success(true, 'Server cache cleared successfully')
})
