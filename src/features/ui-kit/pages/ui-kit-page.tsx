import { useState } from 'react'
import { toast } from 'sonner'
import { Mail, Search, Inbox, Download, Users, TrendingUp, Activity, ArrowRight } from 'lucide-react'
import {
  PageHeader,
  Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter,
  Button,
  Badge,
  Input,
  Select,
  Textarea,
  Modal,
  Tabs,
  Avatar,
  Spinner,
  StatCard,
  StatusBadge,
  EmptyState,
  TableSkeleton,
  StatCardSkeleton,
  Toggle,
  Checkbox,
  SearchInput,
  FilterChips,
  RowActions,
} from '@/shared/ui'

function Section({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent className="pt-2">{children}</CardContent>
    </Card>
  )
}

export function UIKitPage() {
  const [modalOpen, setModalOpen] = useState(false)
  const [tab, setTab] = useState('overview')
  const [toggle1, setToggle1] = useState(true)
  const [toggle2, setToggle2] = useState(false)
  const [check1, setCheck1] = useState(true)
  const [check2, setCheck2] = useState(false)
  const [search, setSearch] = useState('')
  const [chip, setChip] = useState<'all' | 'active' | 'archived'>('all')

  return (
    <div className="space-y-6">
      <PageHeader title="UI Kit" subtitle="Reusable components available in this template" />

      {/* Buttons */}
      <Section title="Buttons" description="Variants, sizes, icons, loading state">
        <div className="space-y-4">
          <div className="flex flex-wrap gap-3">
            <Button>Primary</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="outline">Outline</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="success">Success</Button>
            <Button variant="danger">Danger</Button>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button size="sm">Small</Button>
            <Button size="md">Medium</Button>
            <Button size="lg">Large</Button>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button leftIcon={<Download className="w-4 h-4" />}>With Icon</Button>
            <Button rightIcon={<ArrowRight className="w-4 h-4" />} variant="outline">Continue</Button>
            <Button loading>Loading</Button>
            <Button disabled>Disabled</Button>
          </div>
        </div>
      </Section>

      {/* Badges */}
      <Section title="Badges" description="Subtle labels and status indicators">
        <div className="flex flex-wrap gap-2">
          <Badge>Default</Badge>
          <Badge variant="success">Success</Badge>
          <Badge variant="danger">Danger</Badge>
          <Badge variant="warning">Warning</Badge>
          <Badge variant="info">Info</Badge>
          <Badge variant="outline">Outline</Badge>
          <Badge variant="purple">Purple</Badge>
        </div>
      </Section>

      {/* Status Badges */}
      <Section title="Status Badges" description="Auto-styled by status string">
        <div className="flex flex-wrap gap-2">
          <StatusBadge status="active" />
          <StatusBadge status="inactive" />
          <StatusBadge status="pending" />
          <StatusBadge status="in_progress" />
          <StatusBadge status="completed" />
          <StatusBadge status="failed" />
          <StatusBadge status="admin" />
        </div>
      </Section>

      {/* Avatars */}
      <Section title="Avatars" description="Auto-colored initials based on name">
        <div className="flex items-end gap-4">
          <Avatar name="Ada Lovelace" size="sm" />
          <Avatar name="Grace Hopper" size="md" />
          <Avatar name="Alan Turing" size="lg" />
          <Avatar name="Katherine Johnson" size="md" />
          <Avatar name="Tim Berners-Lee" size="md" />
        </div>
      </Section>

      {/* Form Controls */}
      <Section title="Form Controls">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-3xl">
          <Input label="Email" type="email" placeholder="you@example.com" leftIcon={<Mail className="w-4 h-4" />} />
          <Input label="Search" placeholder="Search..." leftIcon={<Search className="w-4 h-4" />} />
          <Input label="With Error" defaultValue="invalid" error="Must be a valid value" />
          <Input label="Helper Text" placeholder="Username" helperText="Must be unique" />
          <Select
            label="Role"
            placeholder="Select a role"
            options={[
              { label: 'Administrator', value: 'admin' },
              { label: 'Editor', value: 'editor' },
              { label: 'Viewer', value: 'viewer' },
            ]}
          />
          <Select
            label="Status"
            options={[
              { label: 'Active', value: 'active' },
              { label: 'Inactive', value: 'inactive' },
            ]}
          />
          <div className="md:col-span-2">
            <Textarea label="Message" rows={3} placeholder="Write something..." />
          </div>
        </div>
      </Section>

      {/* Toggle */}
      <Section title="Toggle" description="Binary switch, two sizes">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3">
            <Toggle checked={toggle1} onChange={setToggle1} />
            <span className="text-[13px] text-zinc-600">{toggle1 ? 'On' : 'Off'}</span>
          </div>
          <div className="flex items-center gap-3">
            <Toggle size="sm" checked={toggle2} onChange={setToggle2} />
            <span className="text-[13px] text-zinc-600">Small</span>
          </div>
          <div className="flex items-center gap-3">
            <Toggle checked disabled onChange={() => {}} />
            <span className="text-[13px] text-zinc-400">Disabled</span>
          </div>
        </div>
      </Section>

      {/* Checkbox */}
      <Section title="Checkbox" description="Supports checked, unchecked, and indeterminate">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2.5">
            <Checkbox checked={check1} onChange={setCheck1} />
            <span className="text-[13px] text-zinc-600">Default</span>
          </div>
          <div className="flex items-center gap-2.5">
            <Checkbox size="md" checked={check2} onChange={setCheck2} />
            <span className="text-[13px] text-zinc-600">Medium size</span>
          </div>
          <div className="flex items-center gap-2.5">
            <Checkbox checked indeterminate onChange={() => {}} />
            <span className="text-[13px] text-zinc-600">Indeterminate</span>
          </div>
          <div className="flex items-center gap-2.5">
            <Checkbox checked disabled onChange={() => {}} />
            <span className="text-[13px] text-zinc-400">Disabled</span>
          </div>
        </div>
      </Section>

      {/* Search Input */}
      <Section title="Search Input" description="Standardized search with icon">
        <div className="max-w-md">
          <SearchInput value={search} onChange={setSearch} placeholder="Search anything..." />
        </div>
      </Section>

      {/* Filter Chips */}
      <Section title="Filter Chips" description="Segmented control for filters">
        <FilterChips
          value={chip}
          onChange={setChip}
          options={[
            { value: 'all', label: 'All', count: 128 },
            { value: 'active', label: 'Active', count: 94 },
            { value: 'archived', label: 'Archived', count: 34 },
          ]}
        />
      </Section>

      {/* Row Actions */}
      <Section title="Row Actions" description="Three-dot menu for table rows">
        <div className="flex items-center gap-4 p-3 rounded-lg bg-zinc-50 border border-zinc-100 max-w-md">
          <Avatar name="Example Row" size="sm" />
          <span className="text-[13px] text-zinc-700 flex-1">Example row</span>
          <RowActions
            onView={() => toast.info('View action')}
            onEdit={() => toast.info('Edit action')}
            onDelete={() => toast.success('Delete action')}
          />
        </div>
      </Section>

      {/* Stat Cards */}
      <Section title="Stat Cards" description="Animated counters with trend indicator">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard title="Total Users" value={12483} icon={Users} iconBg="bg-blue-50" iconColor="text-blue-600" trend={{ value: 12, positive: true }} index={0} />
          <StatCard title="Revenue" value="$48,200" icon={TrendingUp} iconBg="bg-emerald-50" iconColor="text-emerald-600" trend={{ value: 8, positive: true }} index={1} />
          <StatCard title="Active" value={342} subtitle="online now" icon={Activity} iconBg="bg-violet-50" iconColor="text-violet-500" index={2} />
          <StatCard title="Inbox" value={24} icon={Inbox} iconBg="bg-amber-50" iconColor="text-amber-500" trend={{ value: 4, positive: false }} index={3} />
        </div>
      </Section>

      {/* Tabs */}
      <Section title="Tabs" description="Underlined with optional count badges">
        <Tabs
          items={[
            { label: 'Overview', value: 'overview' },
            { label: 'Members', value: 'members', count: 12 },
            { label: 'Settings', value: 'settings' },
            { label: 'Archive', value: 'archive', count: 3 },
          ]}
          value={tab}
          onChange={setTab}
        />
        <div className="pt-4 text-[13px] text-zinc-500">
          Active tab: <span className="font-medium text-zinc-900">{tab}</span>
        </div>
      </Section>

      {/* Card variants */}
      <Section title="Cards">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Basic Card</CardTitle>
              <CardDescription>With a title and description.</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-[13px] text-zinc-600">Cards are the default container for grouped content.</p>
            </CardContent>
            <CardFooter className="justify-end gap-2">
              <Button variant="ghost" size="sm">Cancel</Button>
              <Button size="sm">Save</Button>
            </CardFooter>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Footer Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-[13px] text-zinc-600">Use <code className="px-1 rounded bg-zinc-100 text-[12px]">CardFooter</code> for primary actions aligned to the bottom.</p>
            </CardContent>
          </Card>
        </div>
      </Section>

      {/* Spinner & Skeleton */}
      <Section title="Loading States">
        <div className="space-y-6">
          <div className="flex items-center gap-6">
            <Spinner size="sm" />
            <Spinner size="md" />
            <Spinner size="lg" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
          </div>
          <TableSkeleton columns={5} rows={3} />
        </div>
      </Section>

      {/* Empty State */}
      <Section title="Empty State">
        <EmptyState
          icon={Inbox}
          title="No messages yet"
          description="Your inbox is empty. Messages from your team will show up here."
          action={<Button size="sm">Compose Message</Button>}
        />
      </Section>

      {/* Modal */}
      <Section title="Modal" description="Dialogs with backdrop, ESC to close">
        <Button onClick={() => setModalOpen(true)}>Open Modal</Button>
        <Modal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          title="Example Modal"
          footer={
            <>
              <Button variant="ghost" onClick={() => setModalOpen(false)}>Cancel</Button>
              <Button onClick={() => { setModalOpen(false); toast.success('Confirmed') }}>Confirm</Button>
            </>
          }
        >
          <p className="text-[13px] text-zinc-600">
            Modals support sizes <code className="px-1 rounded bg-zinc-100 text-[12px]">sm</code>, <code className="px-1 rounded bg-zinc-100 text-[12px]">md</code>, <code className="px-1 rounded bg-zinc-100 text-[12px]">lg</code>, <code className="px-1 rounded bg-zinc-100 text-[12px]">xl</code> and an optional footer slot for actions.
          </p>
        </Modal>
      </Section>

      {/* Toasts */}
      <Section title="Toasts" description="Powered by sonner">
        <div className="flex flex-wrap gap-3">
          <Button variant="outline" size="sm" onClick={() => toast('Default toast')}>Default</Button>
          <Button variant="outline" size="sm" onClick={() => toast.success('Saved successfully')}>Success</Button>
          <Button variant="outline" size="sm" onClick={() => toast.error('Something went wrong')}>Error</Button>
          <Button variant="outline" size="sm" onClick={() => toast.info('Heads up')}>Info</Button>
          <Button variant="outline" size="sm" onClick={() => toast.warning('Check this out')}>Warning</Button>
        </div>
      </Section>
    </div>
  )
}
