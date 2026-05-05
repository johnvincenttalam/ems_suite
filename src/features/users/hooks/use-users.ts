import { useQuery } from '@tanstack/react-query'
import { usersApi } from '@/features/users/api/users-api'

export function useUsers() {
  return useQuery({ queryKey: ['users'], queryFn: usersApi.list })
}
