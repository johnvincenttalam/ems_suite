import { Workflow } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { env } from '@/shared/env'

export interface DemoAccount {
  email: string
  label: string
  /** One-line access summary shown next to the email on the login form. */
  scope: string
}

export interface AppConfig {
  name: string
  shortName: string
  logo: LucideIcon
  login: {
    heading: string
    tagline: string
    features: string[]
  }
  demo: {
    password: string
    accounts: DemoAccount[]
  }
}

export const appConfig: AppConfig = {
  name: env.appName,
  shortName: env.appShortName,
  logo: Workflow,
  login: {
    heading: 'Welcome back',
    tagline: 'Operations, assets, and procurement in one place.',
    features: [
      'Asset registry & lifecycle tracking',
      'Inventory, procurement & approvals',
      'Maintenance work orders & checklists',
      'Quality reporting & cross-module analytics',
    ],
  },
  demo: {
    password: 'demo123',
    accounts: [
      { email: 'admin@example.com',                 label: 'Platform Admin',     scope: 'Admin · all 7 modules' },
      { email: 'operations@example.com',            label: 'Operations Lead',    scope: 'Mixed tiers · 6 modules' },
      { email: 'documents@example.com',             label: 'Document Controller',scope: 'SDMS admin · 2 modules' },
      { email: 'maintenance-admin@example.com',     label: 'Maintenance Admin',  scope: 'Maintenance admin only' },
      { email: 'procurement-manager@example.com',   label: 'Procurement Manager',scope: 'Procurement manager · 2 modules' },
    ],
  },
}
