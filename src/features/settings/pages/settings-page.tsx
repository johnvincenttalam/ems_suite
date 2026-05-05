import { useState } from 'react'
import { Building2, Bell, Shield, Server, Palette, Check } from 'lucide-react'
import { cn } from '@/shared/utils/cn'
import { PageHeader } from '@/shared/ui/page-header'
import { Card, CardContent } from '@/shared/ui/card'
import { Toggle } from '@/shared/ui/toggle'
import { useThemeStore } from '@/shared/stores/theme-store'
import { ACCENTS, accentSwatches } from '@/config/theme'

const tabs = [
  { label: 'General', value: 'general', icon: Building2 },
  { label: 'Appearance', value: 'appearance', icon: Palette },
  { label: 'Notifications', value: 'notifications', icon: Bell },
  { label: 'Security', value: 'security', icon: Shield },
  { label: 'System', value: 'system', icon: Server },
]

export function SettingsPage() {
  const [activeTab, setActiveTab] = useState('general')
  const [notifications, setNotifications] = useState({ email: true, sms: false, push: true, updates: true, marketing: false })
  const { accent, setAccent, theme, setTheme } = useThemeStore()

  return (
    <div>
      <PageHeader title="Settings" subtitle="Manage system configuration" />
      <div className="flex gap-6 flex-col lg:flex-row">
        <div className="lg:w-56 flex lg:flex-col gap-1 overflow-x-auto">
          {tabs.map(tab => (
            <button key={tab.value} onClick={() => setActiveTab(tab.value)} className={cn(
              'flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all cursor-pointer',
              activeTab === tab.value ? 'bg-accent text-accent-fg' : 'text-zinc-600 hover:bg-zinc-100'
            )}>
              <tab.icon className="w-4 h-4" />{tab.label}
            </button>
          ))}
        </div>

        <div className="flex-1 max-w-2xl">
          {activeTab === 'general' && (
            <Card>
              <CardContent className="space-y-6 p-6">
                <h3 className="text-sm font-semibold text-zinc-900">Organization</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {[
                    { label: 'Organization Name', value: 'Your Company' },
                    { label: 'Address', value: '—' },
                    { label: 'Contact Number', value: '—' },
                    { label: 'Email', value: 'admin@example.com' },
                    { label: 'Timezone', value: 'UTC' },
                    { label: 'Locale', value: 'en-US' },
                  ].map(item => (
                    <div key={item.label}>
                      <p className="text-xs text-zinc-400 mb-1">{item.label}</p>
                      <p className="text-sm font-medium text-zinc-700">{item.value}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {activeTab === 'appearance' && (
            <Card>
              <CardContent className="space-y-8 p-6">
                {/* Accent */}
                <div>
                  <h3 className="text-sm font-semibold text-zinc-900 mb-1">Accent Color</h3>
                  <p className="text-[13px] text-zinc-500 mb-4">Used for primary buttons and highlights.</p>
                  <div className="flex items-center gap-3">
                    {ACCENTS.map((a) => {
                      const selected = accent === a
                      return (
                        <button
                          key={a}
                          onClick={() => setAccent(a)}
                          className={cn(
                            'relative w-10 h-10 rounded-full ring-offset-2 transition-all cursor-pointer',
                            selected ? 'ring-2 ring-zinc-900' : 'hover:scale-105'
                          )}
                          style={{ backgroundColor: accentSwatches[a].swatch }}
                          aria-label={`Accent ${accentSwatches[a].label}`}
                        >
                          {selected && <Check className="absolute inset-0 m-auto w-4 h-4 text-white" />}
                        </button>
                      )
                    })}
                  </div>
                  <p className="text-[12px] text-zinc-400 mt-3">Current: <span className="text-zinc-700 font-medium">{accentSwatches[accent].label}</span></p>
                </div>

                {/* Theme */}
                <div className="pt-6 border-t border-zinc-100">
                  <h3 className="text-sm font-semibold text-zinc-900 mb-1">Theme</h3>
                  <p className="text-[13px] text-zinc-500 mb-4">Switch between light and dark mode.</p>
                  <div className="flex items-center gap-2">
                    {(['light', 'dark'] as const).map((t) => (
                      <button
                        key={t}
                        onClick={() => setTheme(t)}
                        className={cn(
                          'px-4 py-2 rounded-lg text-[13px] font-medium capitalize transition-colors cursor-pointer border',
                          theme === t
                            ? 'bg-accent text-accent-fg border-transparent'
                            : 'bg-white text-zinc-600 border-zinc-200 hover:border-zinc-400'
                        )}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {activeTab === 'notifications' && (
            <Card>
              <CardContent className="space-y-6 p-6">
                <h3 className="text-sm font-semibold text-zinc-900">Notification Preferences</h3>
                {[
                  { key: 'email' as const, label: 'Email Notifications', desc: 'Receive notifications via email' },
                  { key: 'sms' as const, label: 'SMS Notifications', desc: 'Receive text message alerts' },
                  { key: 'push' as const, label: 'Push Notifications', desc: 'Browser push notifications' },
                  { key: 'updates' as const, label: 'Product Updates', desc: 'News about new features and releases' },
                  { key: 'marketing' as const, label: 'Marketing Emails', desc: 'Occasional marketing communications' },
                ].map(item => (
                  <div key={item.key} className="flex items-center justify-between py-3 border-b border-zinc-100/60 last:border-0">
                    <div><p className="text-sm font-medium text-zinc-700">{item.label}</p><p className="text-xs text-zinc-400">{item.desc}</p></div>
                    <Toggle checked={notifications[item.key]} onChange={(v) => setNotifications(prev => ({ ...prev, [item.key]: v }))} />
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {activeTab === 'security' && (
            <Card>
              <CardContent className="space-y-6 p-6">
                <h3 className="text-sm font-semibold text-zinc-900">Security Settings</h3>
                <div className="space-y-4">
                  <div><p className="text-sm font-medium text-zinc-700 mb-2">Change Password</p>
                    <div className="space-y-3 max-w-sm">
                      <input type="password" placeholder="Current password" className="w-full px-4 py-2.5 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900/5 focus:border-zinc-400" />
                      <input type="password" placeholder="New password" className="w-full px-4 py-2.5 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900/5 focus:border-zinc-400" />
                      <input type="password" placeholder="Confirm new password" className="w-full px-4 py-2.5 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900/5 focus:border-zinc-400" />
                      <button className="px-4 py-2.5 bg-accent text-accent-fg rounded-xl text-sm font-medium hover:bg-accent-hover transition-colors cursor-pointer">Update Password</button>
                    </div>
                  </div>
                  <div className="pt-4 border-t border-zinc-200/60">
                    <p className="text-sm font-medium text-zinc-700 mb-1">Session Timeout</p>
                    <p className="text-xs text-zinc-400 mb-3">Automatically log out after inactivity</p>
                    <select className="px-4 py-2.5 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900/5 focus:border-zinc-400">
                      <option>15 minutes</option><option>30 minutes</option><option>1 hour</option><option>4 hours</option>
                    </select>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {activeTab === 'system' && (
            <Card>
              <CardContent className="space-y-6 p-6">
                <h3 className="text-sm font-semibold text-zinc-900">System Information</h3>
                <div className="space-y-3">
                  {[
                    { label: 'Application Version', value: 'v1.0.0' },
                    { label: 'Frontend', value: 'React 19 + TypeScript + Vite' },
                    { label: 'Environment', value: 'Production' },
                  ].map(item => (
                    <div key={item.label} className="flex justify-between py-2 border-b border-zinc-100/60">
                      <span className="text-sm text-zinc-500">{item.label}</span>
                      <span className="text-sm font-medium text-zinc-700">{item.value}</span>
                    </div>
                  ))}
                  <div className="flex items-center gap-3 pt-2">
                    <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-sm text-emerald-600 font-medium">All systems operational</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
