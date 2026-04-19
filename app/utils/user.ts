import { DEFAULT_USER_ID } from '@/constants/pref'

export function getCurrentUserId() {
  const { user } = useUserSession()
  return user.value?.id ?? DEFAULT_USER_ID
}
