import { useQuery } from '@apollo/client'
import { GET_ME } from '@/lib/gql'

export type UserRole = 'buyer' | 'seller' | 'both'

export interface MeUser {
  id: string
  fullName: string | null
  email: string | null
  role: UserRole
  avatarUrl: string | null
  createdAt: string
}

interface UseMeResult {
  me: MeUser | null
  loading: boolean
  canViewCriteria: boolean
  canCreateProperty: boolean
  canCreateCriteria: boolean
  refetch: () => void
}

export function useMe(): UseMeResult {
  const { data, loading, refetch } = useQuery<{ me: MeUser | null }>(GET_ME, {
    fetchPolicy: 'cache-and-network',
  })
  const me = data?.me ?? null
  const role = me?.role
  return {
    me,
    loading,
    canViewCriteria: role === 'seller' || role === 'both',
    canCreateProperty: role === 'seller' || role === 'both',
    canCreateCriteria: role === 'buyer' || role === 'both',
    refetch: () => { void refetch() },
  }
}
