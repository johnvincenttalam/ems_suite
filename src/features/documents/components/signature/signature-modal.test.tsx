import { render, screen, fireEvent } from '@testing-library/react'
import { vi } from 'vitest'
import { SignatureModal } from './signature-modal'

vi.mock('react-signature-canvas', () => {
  const React = require('react')
  return {
    __esModule: true,
    default: React.forwardRef((_props: any, ref: any) => {
      React.useImperativeHandle(ref, () => ({
        clear: vi.fn(),
        isEmpty: () => true,
        toDataURL: () => 'data:image/png;base64,mock',
      }))
      return React.createElement('canvas', { 'data-testid': 'sig-canvas' })
    }),
  }
})

describe('SignatureModal', () => {
  const onClose = vi.fn()
  const onConfirm = vi.fn()

  beforeEach(() => {
    onClose.mockClear()
    onConfirm.mockClear()
  })

  it('renders when open', () => {
    render(<SignatureModal open title="Sign doc" onClose={onClose} onConfirm={onConfirm} />)
    expect(screen.getByText('Sign doc')).toBeInTheDocument()
    expect(screen.getByText('Draw')).toBeInTheDocument()
    expect(screen.getByText('Upload')).toBeInTheDocument()
  })

  it('does not render when closed', () => {
    render(<SignatureModal open={false} title="Sign doc" onClose={onClose} onConfirm={onConfirm} />)
    expect(screen.queryByText('Sign doc')).not.toBeInTheDocument()
  })

  it('confirm button is disabled without a signature', () => {
    render(<SignatureModal open title="Sign doc" onClose={onClose} onConfirm={onConfirm} />)
    const confirmBtn = screen.getByRole('button', { name: /confirm signature/i })
    expect(confirmBtn).toBeDisabled()
  })

  it('switches between draw and upload modes', () => {
    render(<SignatureModal open title="Sign doc" onClose={onClose} onConfirm={onConfirm} />)
    expect(screen.getByTestId('sig-canvas')).toBeInTheDocument()

    fireEvent.click(screen.getByText('Upload'))
    expect(screen.queryByTestId('sig-canvas')).not.toBeInTheDocument()
    expect(screen.getByText(/click or drop a png/i)).toBeInTheDocument()

    fireEvent.click(screen.getByText('Draw'))
    expect(screen.getByTestId('sig-canvas')).toBeInTheDocument()
  })
})
