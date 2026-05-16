import { addMinutes, isExpired } from '../../utils/moscowTime.js'

describe('addMinutes', () => {
    test('adds minutes correctly', () => {
        const before = Date.now(),
         result = addMinutes(5),
         after = Date.now()

        const expectedMin = before + 5 * 60 * 1000,
         expectedMax = after + 5 * 60 * 1000

        expect(result.getTime()).toBeGreaterThanOrEqual(expectedMin - 1000)
        expect(result.getTime()).toBeLessThanOrEqual(expectedMax + 1000)
    })
})

describe('isExpired', () => {
    test('past date is expired', () => {
        const past = new Date(Date.now() - 60000)
        expect(isExpired(past)).toBe(true)
    })

    test('future date is not expired', () => {
        const future = new Date(Date.now() + 60000)
        expect(isExpired(future)).toBe(false)
    })

    test('string date works', () => {
        const future = new Date(Date.now() + 60000).toISOString()
        expect(isExpired(future)).toBe(false)
    })
})
