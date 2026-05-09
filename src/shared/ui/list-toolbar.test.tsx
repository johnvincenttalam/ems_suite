import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ListToolbar } from './list-toolbar'
import { FilterChips } from './filter-chips'

describe('ListToolbar', () => {
  it('renders the search input when search prop is provided', () => {
    render(
      <ListToolbar search={{ value: '', onChange: vi.fn(), placeholder: 'Search rows…' }} />,
    )
    expect(screen.getByPlaceholderText('Search rows…')).toBeInTheDocument()
  })

  it('omits the search input when search prop is missing', () => {
    render(<ListToolbar>action</ListToolbar>)
    expect(screen.queryByRole('searchbox')).not.toBeInTheDocument()
  })

  it('forwards search keystrokes through onChange', async () => {
    const onChange = vi.fn()
    render(<ListToolbar search={{ value: '', onChange, placeholder: 'Search' }} />)
    await userEvent.type(screen.getByPlaceholderText('Search'), 'a')
    expect(onChange).toHaveBeenCalledWith('a')
  })

  it('renders the filter slot and the right-side actions slot', () => {
    render(
      <ListToolbar
        filter={
          <FilterChips
            value="all"
            onChange={vi.fn()}
            options={[
              { value: 'all', label: 'All' },
              { value: 'active', label: 'Active' },
            ]}
          />
        }
      >
        <button type="button">Register</button>
      </ListToolbar>,
    )
    expect(screen.getByRole('button', { name: 'All' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Active' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Register' })).toBeInTheDocument()
  })

  it('hides the actions wrapper when no children are provided', () => {
    const { container } = render(
      <ListToolbar search={{ value: '', onChange: vi.fn() }} />,
    )
    // Root is the outer flex container; no second child div should render.
    const root = container.firstElementChild
    expect(root?.children.length).toBe(1)
  })
})
