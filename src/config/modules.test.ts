import { describe, it, expect } from 'vitest'
import { modules, getModule } from './modules'

function getNavItem(moduleKey: string, feature: string) {
  const m = getModule(moduleKey)!
  return m.nav.flatMap((g) => g.items).find((i) => i.feature === feature)
}

describe('SDMS module configuration', () => {
  const sdms = modules.find((m) => m.key === 'sdms')!

  it('exposes My Tasks as a visible nav item', () => {
    const item = getNavItem('sdms', 'sdmsMyTasks')
    expect(item).toBeDefined()
    expect(item?.path).toBe('my-tasks')
    expect(item?.hidden).toBeFalsy()
  })

  it('registers Create Document as a hidden route', () => {
    const item = getNavItem('sdms', 'sdmsCreateDocument')
    expect(item).toBeDefined()
    expect(item?.path).toBe('create-document')
    expect(item?.hidden).toBe(true)
  })

  it('registers Document Viewer as a hidden parameterized route', () => {
    const item = getNavItem('sdms', 'sdmsDocumentViewer')
    expect(item).toBeDefined()
    expect(item?.path).toBe('documents/:id')
    expect(item?.hidden).toBe(true)
  })

  it('preserves legacy URLs via redirects', () => {
    const fromPaths = (sdms.redirects ?? []).map((r) => r.from)
    expect(fromPaths).toEqual(
      expect.arrayContaining(['inbox', 'workflow', 'archive', 'alerts', 'calendar', 'logs']),
    )
  })
})
