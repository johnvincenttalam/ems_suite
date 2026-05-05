import { useState } from 'react'
import { PageHeader } from '@/shared/ui/page-header'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/shared/ui/card'
import { Tabs } from '@/shared/ui/tabs'
import { WizardForm } from '../components/wizard-form'
import { ConditionalForm } from '../components/conditional-form'
import { UploadForm } from '../components/upload-form'
import { ValidationForm } from '../components/validation-form'

const tabs = [
  {
    value: 'wizard',
    label: 'Wizard',
    title: 'Multi-step Wizard',
    description: 'Step-by-step form with validation per step. Uses react-hook-form + zod.',
  },
  {
    value: 'conditional',
    label: 'Conditional',
    title: 'Conditional Fields',
    description: 'Fields appear and validate based on other field values.',
  },
  {
    value: 'upload',
    label: 'File Upload',
    title: 'File Upload',
    description: 'Drag-and-drop zone with previews and progress indicators.',
  },
  {
    value: 'validation',
    label: 'Validation',
    title: 'Validation Showcase',
    description: 'Complex zod rules with live password strength indicators.',
  },
]

export function FormsPage() {
  const [tab, setTab] = useState('wizard')
  const current = tabs.find((t) => t.value === tab)!

  return (
    <div>
      <PageHeader title="Forms" subtitle="Patterns for common form scenarios" />

      <Tabs
        items={tabs.map((t) => ({ label: t.label, value: t.value }))}
        value={tab}
        onChange={setTab}
        className="mb-6"
      />

      <Card>
        <CardHeader>
          <CardTitle>{current.title}</CardTitle>
          <CardDescription>{current.description}</CardDescription>
        </CardHeader>
        <CardContent className="p-6 pt-2">
          {tab === 'wizard' && <WizardForm />}
          {tab === 'conditional' && <ConditionalForm />}
          {tab === 'upload' && <UploadForm />}
          {tab === 'validation' && <ValidationForm />}
        </CardContent>
      </Card>
    </div>
  )
}
