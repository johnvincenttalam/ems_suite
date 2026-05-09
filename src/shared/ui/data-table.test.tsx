import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Truck } from 'lucide-react'
import {
  useReactTable,
  getCoreRowModel,
  getPaginationRowModel,
  type ColumnDef,
} from '@tanstack/react-table'
import { DataTable } from './data-table'

interface Row {
  id: string
  name: string
}

const columns: ColumnDef<Row>[] = [
  { accessorKey: 'id', header: 'ID', cell: ({ getValue }) => <span>{getValue() as string}</span> },
  { accessorKey: 'name', header: 'Name', cell: ({ getValue }) => <span>{getValue() as string}</span> },
]

function HostedTable({
  data,
  onRowClick,
  hidePagination,
}: {
  data: Row[]
  onRowClick?: (row: Row) => void
  hidePagination?: boolean
}) {
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  })
  return (
    <DataTable
      table={table}
      columns={columns}
      emptyIcon={Truck}
      emptyMessage="Nothing here yet"
      onRowClick={onRowClick}
      hidePagination={hidePagination}
    />
  )
}

describe('DataTable', () => {
  it('renders a row for each data entry', () => {
    render(<HostedTable data={[{ id: 'A', name: 'Alpha' }, { id: 'B', name: 'Bravo' }]} />)
    expect(screen.getByText('Alpha')).toBeInTheDocument()
    expect(screen.getByText('Bravo')).toBeInTheDocument()
  })

  it('shows the empty state message when there are no rows', () => {
    render(<HostedTable data={[]} />)
    expect(screen.getByText('Nothing here yet')).toBeInTheDocument()
  })

  it('fires onRowClick with the row data when set', async () => {
    const onRowClick = vi.fn()
    render(<HostedTable data={[{ id: 'A', name: 'Alpha' }]} onRowClick={onRowClick} />)
    await userEvent.click(screen.getByText('Alpha'))
    expect(onRowClick).toHaveBeenCalledWith({ id: 'A', name: 'Alpha' })
  })

  it('does not add cursor-pointer when onRowClick is omitted', () => {
    const { container } = render(<HostedTable data={[{ id: 'A', name: 'Alpha' }]} />)
    const row = container.querySelector('tbody tr')
    expect(row?.className).not.toContain('cursor-pointer')
  })

  it('hides the pagination footer when hidePagination is true', () => {
    render(<HostedTable data={[{ id: 'A', name: 'Alpha' }]} hidePagination />)
    expect(screen.queryByRole('button', { name: /next/i })).not.toBeInTheDocument()
  })
})
