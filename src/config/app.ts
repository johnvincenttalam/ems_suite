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
      { email: 'admin@example.com',       label: 'Admin',      scope: 'All modules' },
      { email: 'operations@example.com',  label: 'Operations', scope: 'MIS, Inventory, Assets, Fleet, Maintenance' },
      { email: 'documents@example.com',   label: 'Documents',  scope: 'MIS, SDMS' },
    ],
  },
}
