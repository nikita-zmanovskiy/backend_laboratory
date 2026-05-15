export const getMoscowTime = (): Date => {
    return new Date()
}

export const getMoscowISOString = (): string => {
    const now = new Date(),
     moscowTime = new Date(now.getTime() + 3 * 60 * 60 * 1000)
    return moscowTime.toISOString().replace('Z', '+03:00')
}

export const addMinutes = (minutes: number): Date => {
    return new Date(Date.now() + minutes * 60 * 1000)
}

export const isExpired = (expiresAt: Date | string): boolean => {
    return Date.now() > new Date(expiresAt).getTime()
}