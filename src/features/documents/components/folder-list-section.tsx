import { Folder, Pencil, FolderInput, Trash2 } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import type { StorageFolder, StorageItem } from '@/features/documents/types'
import { ActionMenu, type ActionMenuItem } from '@/shared/ui/action-menu'
import type { FolderAction } from '@/features/documents/components/folder-tree'

interface FolderListSectionProps {
  folders: StorageFolder[]
  /** All items the user owns — used to count "X items" per folder. */
  allItems: StorageItem[]
  /** All folders the user owns — used to count subfolders per folder. */
  allFolders: StorageFolder[]
  onFolderClick: (folder: StorageFolder) => void
  onFolderAction?: (folder: StorageFolder, action: FolderAction) => void
}

/**
 * List-view rendering for folders. Shown above the items DataTable when the
 * list view is active and there's at least one subfolder in the current
 * folder. Same column rhythm as DataTable for visual continuity.
 */
export function FolderListSection({
  folders,
  allItems,
  allFolders,
  onFolderClick,
  onFolderAction,
}: FolderListSectionProps) {
  if (folders.length === 0) return null

  return (
    <div className="bg-white rounded-xl border border-zinc-200/60 overflow-hidden mb-4">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-zinc-50/50">
              <th className="px-4 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">
                Folders
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">
                Contents
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">
                Created
              </th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {folders.map((folder) => {
              const itemCount = allItems.filter((i) => i.folderId === folder.id && !i.deletedAt).length
              const childFolderCount = allFolders.filter((f) => f.parentId === folder.id).length

              const menuItems: ActionMenuItem[] = onFolderAction
                ? [
                    { key: 'rename', label: 'Rename', icon: Pencil, onClick: () => onFolderAction(folder, 'rename') },
                    { key: 'move', label: 'Move to…', icon: FolderInput, onClick: () => onFolderAction(folder, 'move') },
                    { key: 'delete', label: 'Delete', icon: Trash2, danger: true, onClick: () => onFolderAction(folder, 'delete') },
                  ]
                : []

              return (
                <tr
                  key={folder.id}
                  onClick={() => onFolderClick(folder)}
                  className="border-b border-zinc-100/60 hover:bg-zinc-50/50 cursor-pointer"
                >
                  <td className="px-4 py-3 text-sm">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-7 h-7 rounded-md bg-amber-50 flex items-center justify-center flex-shrink-0">
                        <Folder className="w-3.5 h-3.5 text-amber-500" />
                      </div>
                      <span className="font-medium text-zinc-900 truncate">{folder.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-[12px] text-zinc-500 whitespace-nowrap">
                    {itemCount} file{itemCount === 1 ? '' : 's'}
                    {childFolderCount > 0 && ` · ${childFolderCount} subfolder${childFolderCount === 1 ? '' : 's'}`}
                  </td>
                  <td className="px-4 py-3 text-[12px] text-zinc-500 whitespace-nowrap">
                    {format(parseISO(folder.createdAt), 'MMM d, yyyy')}
                  </td>
                  <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                    <div className="flex justify-end">
                      {menuItems.length > 0 && (
                        <ActionMenu items={menuItems} triggerLabel={`${folder.name} actions`} />
                      )}
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
