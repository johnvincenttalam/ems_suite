import type { User } from '@/features/users/types'

/**
 * Whether a user is eligible to be picked as a driver in the Fleet pickers
 * (start trip, log fuel, assign vehicle). The model has no explicit driver
 * role; we treat `licenseExpiry` as the implicit marker — only users with a
 * driver's license on file can drive a fleet vehicle.
 */
export function isDriver(user: Pick<User, 'status' | 'licenseExpiry'>): boolean {
  return user.status === 'active' && !!user.licenseExpiry
}
