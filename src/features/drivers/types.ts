export type DriverStatus = 'active' | 'inactive'

export interface Driver {
  id: string
  name: string
  /** Driver's license number — free text to accommodate any country's format. */
  licenseNumber: string
  /** Free-text license class / restriction codes (e.g. PH "Restriction 1,2,3",
   *  US "CDL Class A"). Free text keeps the template country-portable. */
  licenseClass: string
  /** ISO yyyy-mm-dd. */
  licenseExpiry: string
  phone?: string
  email?: string
  employeeId?: string
  departmentId?: string
  status: DriverStatus
  /** Linked User id when the driver also has a system login (e.g. an ops
   *  manager who occasionally drives). Optional — most drivers don't need
   *  system access. */
  userId?: string
  /** Driver photo. May be a hosted URL or a base64 data URL from a small
   *  upload (≤ 2 MB). The Avatar component falls back to initials if missing
   *  or unreachable. */
  photoUrl?: string
  createdAt: string
  notes?: string
}
