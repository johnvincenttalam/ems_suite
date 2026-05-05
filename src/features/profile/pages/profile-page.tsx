import { useState } from 'react'
import { toast } from 'sonner'
import { Mail, Phone, MapPin, Shield, Monitor, Smartphone, LogOut } from 'lucide-react'
import { useAuthStore } from '@/features/auth/store/auth-store'
import { PageHeader } from '@/shared/ui/page-header'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card'
import { Avatar } from '@/shared/ui/avatar'
import { Input } from '@/shared/ui/input'
import { Textarea } from '@/shared/ui/textarea'
import { Button } from '@/shared/ui/button'
import { Tabs } from '@/shared/ui/tabs'
import { Badge } from '@/shared/ui/badge'
import { Toggle } from '@/shared/ui/toggle'

const mockSessions = [
  { id: '1', device: 'Chrome on macOS', location: 'San Francisco, US', lastActive: '2 minutes ago', current: true, icon: Monitor },
  { id: '2', device: 'Safari on iPhone', location: 'San Francisco, US', lastActive: '1 hour ago', current: false, icon: Smartphone },
  { id: '3', device: 'Firefox on Windows', location: 'New York, US', lastActive: '3 days ago', current: false, icon: Monitor },
]

export function ProfilePage() {
  const { user } = useAuthStore()
  const [tab, setTab] = useState('profile')
  const [twoFA, setTwoFA] = useState(false)

  return (
    <div>
      <PageHeader title="Profile" subtitle="Manage your account and preferences" />

      {/* Header card */}
      <Card className="mb-6">
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <Avatar name={user?.name ?? 'Admin User'} size="lg" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base font-semibold text-zinc-900">{user?.name ?? 'Admin User'}</h2>
                <Badge variant="success">{user?.role ?? 'admin'}</Badge>
              </div>
              <p className="text-[13px] text-zinc-500 mt-0.5">{user?.email ?? 'admin@example.com'}</p>
            </div>
            <Button variant="outline">Edit</Button>
          </div>
        </CardContent>
      </Card>

      <Tabs
        items={[
          { label: 'Profile', value: 'profile' },
          { label: 'Password', value: 'password' },
          { label: 'Two-Factor', value: '2fa' },
          { label: 'Sessions', value: 'sessions' },
        ]}
        value={tab}
        onChange={setTab}
        className="mb-6"
      />

      {tab === 'profile' && (
        <Card>
          <CardContent className="p-6 space-y-4 max-w-2xl">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input label="Full Name" defaultValue={user?.name ?? 'Admin User'} />
              <Input label="Email" type="email" leftIcon={<Mail className="w-4 h-4" />} defaultValue={user?.email ?? 'admin@example.com'} />
              <Input label="Phone" leftIcon={<Phone className="w-4 h-4" />} defaultValue={user?.phone ?? ''} placeholder="+1 555 000 0000" />
              <Input label="Location" leftIcon={<MapPin className="w-4 h-4" />} placeholder="City, Country" />
            </div>
            <Textarea label="Bio" rows={4} placeholder="Tell us a bit about yourself..." />
            <div className="flex gap-3 pt-2">
              <Button onClick={() => toast.success('Profile updated')}>Save Changes</Button>
              <Button variant="ghost">Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {tab === 'password' && (
        <Card>
          <CardContent className="p-6 space-y-4 max-w-md">
            <Input label="Current Password" type="password" />
            <Input label="New Password" type="password" helperText="At least 8 characters, with numbers and symbols" />
            <Input label="Confirm New Password" type="password" />
            <div className="pt-2">
              <Button onClick={() => toast.success('Password updated')}>Update Password</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {tab === '2fa' && (
        <Card>
          <CardContent className="p-6 space-y-6 max-w-2xl">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                <Shield className="w-5 h-5 text-blue-600" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h3 className="text-sm font-semibold text-zinc-900">Two-factor authentication</h3>
                    <p className="text-[13px] text-zinc-500 mt-0.5">Add an extra layer of security to your account.</p>
                  </div>
                  <Toggle checked={twoFA} onChange={(v) => { setTwoFA(v); toast.success(v ? '2FA enabled' : '2FA disabled') }} />
                </div>
                {twoFA && (
                  <div className="mt-4 p-4 rounded-lg bg-emerald-50 border border-emerald-100 text-[13px] text-emerald-700">
                    Two-factor authentication is active. You'll be asked for a verification code on new sign-ins.
                  </div>
                )}
              </div>
            </div>
            <div className="pt-4 border-t border-zinc-100">
              <h4 className="text-sm font-medium text-zinc-700 mb-3">Recovery codes</h4>
              <p className="text-[13px] text-zinc-500 mb-3">Keep these codes safe. Each can be used once to access your account if you lose your device.</p>
              <Button variant="outline">Generate Recovery Codes</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {tab === 'sessions' && (
        <Card>
          <CardHeader>
            <CardTitle>Active Sessions</CardTitle>
          </CardHeader>
          <CardContent className="p-6 pt-0 space-y-2">
            {mockSessions.map((session) => (
              <div key={session.id} className="flex items-center gap-4 p-3 rounded-lg hover:bg-zinc-50 transition-colors">
                <div className="w-10 h-10 rounded-lg bg-zinc-100 flex items-center justify-center flex-shrink-0">
                  <session.icon className="w-5 h-5 text-zinc-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-[13px] font-medium text-zinc-900">{session.device}</p>
                    {session.current && <Badge variant="success" size="sm">Current</Badge>}
                  </div>
                  <p className="text-[12px] text-zinc-400 mt-0.5">{session.location} · Last active {session.lastActive}</p>
                </div>
                {!session.current && (
                  <Button size="sm" variant="ghost" leftIcon={<LogOut className="w-3.5 h-3.5" />} onClick={() => toast.success('Session revoked')}>
                    Revoke
                  </Button>
                )}
              </div>
            ))}
            <div className="pt-3 border-t border-zinc-100">
              <Button variant="danger" size="sm" leftIcon={<LogOut className="w-4 h-4" />} onClick={() => toast.success('All other sessions signed out')}>
                Sign out all other sessions
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
