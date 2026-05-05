import { useState } from 'react'
import { toast } from 'sonner'
import { Shield, Plus } from 'lucide-react'
import { PageHeader } from '@/shared/ui/page-header'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card'
import { Button } from '@/shared/ui/button'
import { Badge } from '@/shared/ui/badge'
import { Checkbox } from '@/shared/ui/checkbox'
import { cn } from '@/shared/utils/cn'

interface Role {
  id: string
  name: string
  description: string
  userCount: number
}

const initialRoles: Role[] = [
  { id: 'admin', name: 'Administrator', description: 'Full access to everything', userCount: 3 },
  { id: 'editor', name: 'Editor', description: 'Can create and edit content', userCount: 12 },
  { id: 'viewer', name: 'Viewer', description: 'Read-only access', userCount: 48 },
  { id: 'billing', name: 'Billing', description: 'Access to billing and invoices', userCount: 2 },
]

const permissionGroups = [
  {
    name: 'Users',
    permissions: [
      { key: 'users.view', label: 'View users' },
      { key: 'users.create', label: 'Create users' },
      { key: 'users.edit', label: 'Edit users' },
      { key: 'users.delete', label: 'Delete users' },
    ],
  },
  {
    name: 'Content',
    permissions: [
      { key: 'content.view', label: 'View content' },
      { key: 'content.create', label: 'Create content' },
      { key: 'content.edit', label: 'Edit content' },
      { key: 'content.publish', label: 'Publish content' },
    ],
  },
  {
    name: 'Settings',
    permissions: [
      { key: 'settings.view', label: 'View settings' },
      { key: 'settings.edit', label: 'Edit settings' },
      { key: 'settings.billing', label: 'Manage billing' },
    ],
  },
]

const initialPermissions: Record<string, Record<string, boolean>> = {
  admin: Object.fromEntries(permissionGroups.flatMap((g) => g.permissions.map((p) => [p.key, true]))),
  editor: {
    'users.view': true,
    'content.view': true, 'content.create': true, 'content.edit': true, 'content.publish': true,
    'settings.view': true,
  },
  viewer: {
    'users.view': true,
    'content.view': true,
    'settings.view': true,
  },
  billing: {
    'users.view': true,
    'settings.view': true, 'settings.billing': true,
  },
}

export function RolesPage() {
  const [roles] = useState<Role[]>(initialRoles)
  const [selectedRoleId, setSelectedRoleId] = useState(roles[0].id)
  const [permissions, setPermissions] = useState(initialPermissions)

  const selectedRole = roles.find((r) => r.id === selectedRoleId)!
  const rolePerms = permissions[selectedRoleId] ?? {}

  const togglePerm = (key: string) => {
    setPermissions((prev) => ({
      ...prev,
      [selectedRoleId]: { ...prev[selectedRoleId], [key]: !prev[selectedRoleId]?.[key] },
    }))
  }

  return (
    <div>
      <PageHeader
        title="Roles & Permissions"
        subtitle="Define what each role can access"
        actions={<Button leftIcon={<Plus className="w-4 h-4" />} onClick={() => toast.info('New role modal coming soon')}>New Role</Button>}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Roles list */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>Roles</CardTitle>
            </CardHeader>
            <CardContent className="p-3 pt-0">
              <div className="space-y-1">
                {roles.map((role) => (
                  <button
                    key={role.id}
                    onClick={() => setSelectedRoleId(role.id)}
                    className={cn(
                      'w-full flex items-center gap-3 p-3 rounded-lg text-left transition-colors cursor-pointer',
                      selectedRoleId === role.id ? 'bg-zinc-100' : 'hover:bg-zinc-50'
                    )}
                  >
                    <div className={cn(
                      'w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0',
                      selectedRoleId === role.id ? 'bg-zinc-900 text-white' : 'bg-zinc-100 text-zinc-500'
                    )}>
                      <Shield className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-medium text-zinc-900 truncate">{role.name}</p>
                      <p className="text-[12px] text-zinc-400 truncate">{role.description}</p>
                    </div>
                    <Badge variant="outline" size="sm">{role.userCount}</Badge>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Permissions matrix */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>{selectedRole.name}</CardTitle>
                  <p className="text-[13px] text-zinc-500 mt-1">{selectedRole.description}</p>
                </div>
                <Button size="sm" variant="outline" onClick={() => toast.success(`${selectedRole.name} permissions saved`)}>
                  Save
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-6 pt-0 space-y-6">
              {permissionGroups.map((group) => (
                <div key={group.name}>
                  <h4 className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-3">{group.name}</h4>
                  <div className="space-y-1">
                    {group.permissions.map((perm) => {
                      const enabled = !!rolePerms[perm.key]
                      return (
                        <div
                          key={perm.key}
                          role="button"
                          tabIndex={0}
                          onClick={() => togglePerm(perm.key)}
                          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); togglePerm(perm.key) } }}
                          className="w-full flex items-center gap-3 p-2.5 rounded-lg hover:bg-zinc-50 transition-colors cursor-pointer"
                        >
                          <Checkbox size="md" checked={enabled} onChange={() => togglePerm(perm.key)} />
                          <span className="text-[13px] text-zinc-700">{perm.label}</span>
                          <span className="ml-auto text-[11px] font-mono text-zinc-400">{perm.key}</span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
