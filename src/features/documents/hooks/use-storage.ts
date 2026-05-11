import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  storageApi,
  type StorageSort,
  type StorageView,
} from '@/features/documents/api/storage-api'
import { useAuthStore } from '@/features/auth'
import type { StorageUploadedFile } from '@/features/documents/types'

interface UseMyStorageOpts {
  search?: string
  sort?: StorageSort
  view?: StorageView
  folderId?: string | null
  recentLimit?: number
}

/**
 * Owner-scoped Storage list. Skips the fetch entirely when no user is signed
 * in (returns empty data + idle state) so guards on the caller side stay
 * simple.
 */
export function useMyStorage(opts: UseMyStorageOpts = {}) {
  const ownerName = useAuthStore((s) => s.user?.name)
  return useQuery({
    queryKey: [
      'storage',
      'my',
      ownerName ?? '_anon',
      opts.view ?? 'all',
      opts.folderId ?? '_none',
      opts.search ?? '',
      opts.sort ?? 'date_desc',
      opts.recentLimit ?? 0,
    ],
    queryFn: () => storageApi.list(ownerName!, opts),
    enabled: !!ownerName,
  })
}

export function useStorageFolders() {
  const ownerName = useAuthStore((s) => s.user?.name)
  return useQuery({
    queryKey: ['storage', 'folders', ownerName ?? '_anon'],
    queryFn: () => storageApi.listFolders(ownerName!),
    enabled: !!ownerName,
  })
}

function invalidateAll(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: ['storage'] })
  qc.invalidateQueries({ queryKey: ['audit-log'] })
}

export function useCreateStorageFolder() {
  const qc = useQueryClient()
  const ownerName = useAuthStore((s) => s.user?.name)
  return useMutation({
    mutationFn: (input: { name: string; parentId: string | null }) => {
      if (!ownerName) throw new Error('Not signed in')
      return storageApi.createFolder({ ...input, ownerName })
    },
    onSuccess: () => invalidateAll(qc),
  })
}

export function useRenameStorageFolder() {
  const qc = useQueryClient()
  const ownerName = useAuthStore((s) => s.user?.name)
  return useMutation({
    mutationFn: (input: { id: string; name: string }) => {
      if (!ownerName) throw new Error('Not signed in')
      return storageApi.renameFolder(input.id, input.name, ownerName)
    },
    onSuccess: () => invalidateAll(qc),
  })
}

export function useMoveStorageFolder() {
  const qc = useQueryClient()
  const ownerName = useAuthStore((s) => s.user?.name)
  return useMutation({
    mutationFn: (input: { id: string; newParentId: string | null }) => {
      if (!ownerName) throw new Error('Not signed in')
      return storageApi.moveFolder(input.id, input.newParentId, ownerName)
    },
    onSuccess: () => invalidateAll(qc),
  })
}

export function useDeleteStorageFolder() {
  const qc = useQueryClient()
  const ownerName = useAuthStore((s) => s.user?.name)
  return useMutation({
    mutationFn: (id: string) => {
      if (!ownerName) throw new Error('Not signed in')
      return storageApi.deleteFolder(id, ownerName)
    },
    onSuccess: () => invalidateAll(qc),
  })
}

export function useMoveStorageItem() {
  const qc = useQueryClient()
  const ownerName = useAuthStore((s) => s.user?.name)
  return useMutation({
    mutationFn: (input: { id: string; newFolderId: string | null }) => {
      if (!ownerName) throw new Error('Not signed in')
      return storageApi.moveItem(input.id, input.newFolderId, ownerName)
    },
    onSuccess: () => invalidateAll(qc),
  })
}

export function useToggleStorageStar() {
  const qc = useQueryClient()
  const ownerName = useAuthStore((s) => s.user?.name)
  return useMutation({
    mutationFn: (id: string) => {
      if (!ownerName) throw new Error('Not signed in')
      return storageApi.toggleStar(id, ownerName)
    },
    onSuccess: () => invalidateAll(qc),
  })
}

export function useMoveStorageItemToTrash() {
  const qc = useQueryClient()
  const ownerName = useAuthStore((s) => s.user?.name)
  return useMutation({
    mutationFn: (id: string) => {
      if (!ownerName) throw new Error('Not signed in')
      return storageApi.moveToTrash(id, ownerName)
    },
    onSuccess: () => invalidateAll(qc),
  })
}

export function useRestoreStorageItem() {
  const qc = useQueryClient()
  const ownerName = useAuthStore((s) => s.user?.name)
  return useMutation({
    mutationFn: (id: string) => {
      if (!ownerName) throw new Error('Not signed in')
      return storageApi.restoreItem(id, ownerName)
    },
    onSuccess: () => invalidateAll(qc),
  })
}

export function useEmptyStorageTrash() {
  const qc = useQueryClient()
  const ownerName = useAuthStore((s) => s.user?.name)
  return useMutation({
    mutationFn: () => {
      if (!ownerName) throw new Error('Not signed in')
      return storageApi.emptyTrash(ownerName)
    },
    onSuccess: () => invalidateAll(qc),
  })
}

export function useUploadToStorage() {
  const qc = useQueryClient()
  const ownerName = useAuthStore((s) => s.user?.name)
  return useMutation({
    mutationFn: (input: {
      title: string
      description?: string
      tags?: string[]
      folderId?: string | null
      file: StorageUploadedFile
    }) => {
      if (!ownerName) throw new Error('Not signed in')
      return storageApi.upload({ ...input, ownerName })
    },
    onSuccess: () => invalidateAll(qc),
  })
}
