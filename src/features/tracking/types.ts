export type TrackingEntityType = 'asset' | 'vehicle' | 'item'
export type TagType = 'rfid' | 'qr' | 'gps'
export type TagStatus = 'active' | 'inactive'
export type TrackingSource = 'gps' | 'scan'

export interface TrackingTag {
  id: string
  code: string
  type: TagType
  boundEntityType: TrackingEntityType
  boundEntityId: string
  status: TagStatus
  lastSeenAt?: string
  createdAt: string
}

export interface TrackingLog {
  id: string
  tagId: string
  entityType: TrackingEntityType
  entityId: string
  latitude?: number
  longitude?: number
  locationName?: string
  scannedBy?: string
  source: TrackingSource
  timestamp: string
}
