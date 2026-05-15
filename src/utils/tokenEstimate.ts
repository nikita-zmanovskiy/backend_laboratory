export interface TokenEstimate {
    tokens: number
    isApproximate: boolean
}

export const estimateTokens = (text: string): TokenEstimate => {
    const tokens = Math.max(1, Math.ceil((text || '').length / 4))
    return {
        tokens,
        isApproximate: true
    }
}

export const getTokensFromApi = (apiResponse: any): TokenEstimate | null => {
    if (apiResponse?.usage?.total_tokens) {
        return {
            tokens: apiResponse.usage.total_tokens,
            isApproximate: false
        }
    }
    return null
}