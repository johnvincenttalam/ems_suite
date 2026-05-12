import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { ProtectedRoute } from './protected-route'
import { useAuthStore } from '@/features/auth/store/auth-store'
import { modules } from '@/config/modules'
import type { User } from '@/features/users/types'

const inventoryModule = modules.find((m) => m.key === 'inventory')!
const sdmsModule = modules.find((m) => m.key === 'sdms')!

const userWithSdmsOnly: User = {
  id: 'U-test',
  name: 'Limited User',
  email: 'limited@example.com',
  status: 'active',
  createdAt: '2025-01-01',
  moduleRoles: { sdms: 'member' },
}

function renderProtected(opts: { module?: typeof inventoryModule; loginPath?: string }) {
  return render(
    <MemoryRouter initialEntries={[`/module/${opts.module?.key ?? 'inventory'}`]}>
      <Routes>
        <Route
          path={`/module/:moduleKey`}
          element={
            <ProtectedRoute module={opts.module} loginPath={opts.loginPath ?? '/login-stub'}>
              <div>module content</div>
            </ProtectedRoute>
          }
        />
        <Route path="/login-stub" element={<div>login stub</div>} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('ProtectedRoute (module access)', () => {
  beforeEach(() => {
    useAuthStore.setState({
      user: null,
      isAuthenticated: false,
      isRestoring: false,
      selectedModule: null,
    })
  })

  it('redirects to loginPath when not authenticated', () => {
    renderProtected({ module: inventoryModule })
    expect(screen.getByText('login stub')).toBeInTheDocument()
    expect(screen.queryByText('module content')).not.toBeInTheDocument()
  })

  it('renders Access Denied when authenticated but lacks module access', () => {
    useAuthStore.setState({
      user: userWithSdmsOnly,
      isAuthenticated: true,
      isRestoring: false,
      selectedModule: 'inventory',
    })
    renderProtected({ module: inventoryModule })
    expect(screen.getByText(/Access Denied/i)).toBeInTheDocument()
    expect(screen.queryByText('module content')).not.toBeInTheDocument()
  })

  it('renders the children when the user has module access', () => {
    useAuthStore.setState({
      user: userWithSdmsOnly,
      isAuthenticated: true,
      isRestoring: false,
      selectedModule: 'sdms',
    })
    renderProtected({ module: sdmsModule })
    expect(screen.getByText('module content')).toBeInTheDocument()
    expect(screen.queryByText(/Access Denied/i)).not.toBeInTheDocument()
  })
})
