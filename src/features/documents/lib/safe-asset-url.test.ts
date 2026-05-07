import { safeAssetUrl } from './safe-asset-url'

describe('safeAssetUrl', () => {
  it('passes blob, http, https, and root-relative URLs through', () => {
    expect(safeAssetUrl('blob:http://example.com/abc')).toBe('blob:http://example.com/abc')
    expect(safeAssetUrl('http://example.com/x.pdf')).toBe('http://example.com/x.pdf')
    expect(safeAssetUrl('https://example.com/x.pdf')).toBe('https://example.com/x.pdf')
    expect(safeAssetUrl('/sample-document.pdf')).toBe('/sample-document.pdf')
  })

  it('rejects javascript: URLs even with mixed case', () => {
    expect(safeAssetUrl('javascript:alert(1)')).toBeUndefined()
    expect(safeAssetUrl('JavaScript:alert(1)')).toBeUndefined()
    expect(safeAssetUrl('  javascript:alert(1)  ')).toBeUndefined()
  })

  it('rejects file:, data:, and protocol-relative URLs', () => {
    expect(safeAssetUrl('file:///etc/passwd')).toBeUndefined()
    expect(safeAssetUrl('data:text/html,<script>alert(1)</script>')).toBeUndefined()
    expect(safeAssetUrl('//evil.com/x.pdf')).toBeUndefined()
  })

  it('returns undefined for empty / null / whitespace', () => {
    expect(safeAssetUrl(undefined)).toBeUndefined()
    expect(safeAssetUrl(null)).toBeUndefined()
    expect(safeAssetUrl('')).toBeUndefined()
    expect(safeAssetUrl('   ')).toBeUndefined()
  })
})
