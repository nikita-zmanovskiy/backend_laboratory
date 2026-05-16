import { hashPrompt } from '../../utils/crypto.js'

describe('hashPrompt', () => {
    test('empty string returns empty', () => {
        expect(hashPrompt('')).toBe('')
    })

    test('returns 64 char hex string', () => {
        const hash = hashPrompt('test prompt')
        expect(hash).toMatch(/^[a-f0-9]{64}$/)
    })

    test('same input = same hash', () => {
        const hash1 = hashPrompt('hello'),
         hash2 = hashPrompt('hello')
        expect(hash1).toBe(hash2)
    })

    test('different input = different hash', () => {
        const hash1 = hashPrompt('hello'),
         hash2 = hashPrompt('world')
        expect(hash1).not.toBe(hash2)
    })
})
