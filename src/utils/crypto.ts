import crypto from 'crypto'

export const hashPrompt = (prompt: string): string => {
    if (!prompt) return ''
    return crypto.createHash('sha256').update(prompt).digest('hex')
}