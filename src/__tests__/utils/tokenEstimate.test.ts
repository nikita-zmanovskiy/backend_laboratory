import { estimateTokens } from '../../utils/tokenEstimate.js'

describe('estimateTokens', () => {
    test('empty string returns 1 token', () => {
        const result = estimateTokens('')
        expect(result.tokens).toBe(1)
        expect(result.isApproximate).toBe(true)
    })

    test('4 characters = 1 token', () => {
        const result = estimateTokens('abcd')
        expect(result.tokens).toBe(1)
    })

    test('5 characters = 2 tokens', () => {
        const result = estimateTokens('abcde')
        expect(result.tokens).toBe(2)
    })

    test('russian text', () => {
        const result = estimateTokens('Привет мир')
        expect(result.tokens).toBeGreaterThan(0)
    })

    test('null/undefined returns 1', () => {
        const result = estimateTokens(null as any)
        expect(result.tokens).toBe(1)
    })
})
