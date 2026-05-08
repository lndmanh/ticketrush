import { createUseFetch } from '#app/composables/fetch'
import { apiRequest } from '@/utils/apiRequest'

export const useAPI = createUseFetch({
  $fetch: apiRequest,
})
