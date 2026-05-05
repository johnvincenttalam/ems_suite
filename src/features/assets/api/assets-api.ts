import type { Asset, AssetAssignment } from '@/features/assets/types'
import { mockAssets, mockAssetAssignments } from '@/features/assets/data/mock-assets'
// import { http } from '@/shared/lib/http'

const delay = (ms?: number) =>
  new Promise((resolve) => setTimeout(resolve, ms ?? Math.random() * 400 + 250))

/**
 * Assets API — swap with real HTTP when backend is ready:
 *   list:               () => http.get<Asset[]>('/assets')
 *   create:             (body) => http.post<Asset>('/assets', body)
 *   listAssignments:    () => http.get<AssetAssignment[]>('/asset-assignments')
 *   createAssignment:   (body) => http.post<AssetAssignment>('/asset-assignments', body)
 *   returnAssignment:   (id) => http.patch<AssetAssignment>(`/asset-assignments/${id}/return`)
 */
export const assetsApi = {
  list: async (): Promise<Asset[]> => {
    await delay()
    return mockAssets
  },
  listAssignments: async (): Promise<AssetAssignment[]> => {
    await delay()
    return [...mockAssetAssignments].sort((a, b) => b.assignedDate.localeCompare(a.assignedDate))
  },
}
