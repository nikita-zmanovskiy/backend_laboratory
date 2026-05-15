export const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024 // 5мб
export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp']

interface ImageValidationResult {
    valid: boolean
    error?: string
    sizeBytes?: number
    mimeType?: string
}

export const validateImageSize = (base64Image: string): ImageValidationResult => {
    if (!base64Image || typeof base64Image !== 'string') {
        return { valid: false, error: 'No image provided' }
    }

    if (!base64Image.startsWith('data:image/')) {
        return { valid: false, error: 'Invalid image format. Must be data URI (data:image/...)' }
    }

    const mimeMatch = base64Image.match(/^data:(image\/\w+);base64,/)
    if (!mimeMatch) {
        return { valid: false, error: 'Invalid base64 image format' }
    }

    const mimeType = mimeMatch[1]
    if (!ALLOWED_IMAGE_TYPES.includes(mimeType)) {
        return {
            valid: false,
            error: `Unsupported image type: ${mimeType}. Allowed: ${ALLOWED_IMAGE_TYPES.join(', ')}`
        }
    }

    const base64Data = base64Image.split(',')[1] || '',
     sizeBytes = Math.ceil((base64Data.length * 3) / 4)

    if (sizeBytes > MAX_IMAGE_SIZE_BYTES) {
        const sizeMB = (sizeBytes / (1024 * 1024)).toFixed(2),
         maxMB = (MAX_IMAGE_SIZE_BYTES / (1024 * 1024)).toFixed(0)
        return {
            valid: false,
            error: `Image too large: ${sizeMB} MB. Maximum allowed: ${maxMB} MB`
        }
    }

    return {
        valid: true,
        sizeBytes,
        mimeType
    }
}