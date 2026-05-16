import { validateImageSize, ALLOWED_IMAGE_TYPES } from '../../utils/imageValidator.js'

describe('validateImageSize', () => {
    test('empty string is invalid', () => {
        const result = validateImageSize('')
        expect(result.valid).toBe(false)
    })

    test('non-data-uri is invalid', () => {
        const result = validateImageSize('not-an-image')
        expect(result.valid).toBe(false)
    })

    test('valid PNG image', () => {
        const result = validateImageSize('data:image/png;base64,iVBORw0KGgo=')
        expect(result.valid).toBe(true)
        expect(result.mimeType).toBe('image/png')
    })

    test('valid JPEG image', () => {
        const result = validateImageSize('data:image/jpeg;base64,/9j/4AAQ=')
        expect(result.valid).toBe(true)
        expect(result.mimeType).toBe('image/jpeg')
    })

    test('valid WebP image', () => {
        const result = validateImageSize('data:image/webp;base64,UklGRg==')
        expect(result.valid).toBe(true)
        expect(result.mimeType).toBe('image/webp')
    })

    test('GIF is rejected', () => {
        const result = validateImageSize('data:image/gif;base64,R0lGOD=')
        expect(result.valid).toBe(false)
        expect(result.error).toContain('Unsupported')
    })

    test('null is invalid', () => {
        const result = validateImageSize(null as any)
        expect(result.valid).toBe(false)
    })
})
