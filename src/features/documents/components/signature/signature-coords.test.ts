import { toPixels } from './signature-coords'
import type { SignatureSlot } from '@/features/documents/types'

const slot: SignatureSlot = { key: 'a', page: 1, x: 0.65, y: 0.78, width: 0.25, height: 0.1 }

describe('toPixels', () => {
  it('multiplies normalized coordinates by container dimensions', () => {
    expect(toPixels(slot, 1000, 800)).toEqual({
      left: 650,
      top: 624,
      width: 250,
      height: 80,
    })
  })

  it('returns zeros when the container has not measured yet', () => {
    expect(toPixels(slot, 0, 0)).toEqual({ left: 0, top: 0, width: 0, height: 0 })
  })

  it('handles a slot at the origin', () => {
    const origin: SignatureSlot = { key: 'o', page: 1, x: 0, y: 0, width: 0.5, height: 0.5 }
    expect(toPixels(origin, 200, 100)).toEqual({ left: 0, top: 0, width: 100, height: 50 })
  })
})
