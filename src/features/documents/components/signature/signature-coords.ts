import type { SignatureSlot } from '@/features/documents/types'

export interface PixelRect {
  left: number
  top: number
  width: number
  height: number
}

export function toPixels(slot: SignatureSlot, containerWidth: number, containerHeight: number): PixelRect {
  return {
    left: slot.x * containerWidth,
    top: slot.y * containerHeight,
    width: slot.width * containerWidth,
    height: slot.height * containerHeight,
  }
}
