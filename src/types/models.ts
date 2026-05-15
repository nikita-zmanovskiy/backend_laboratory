export interface Classroom {
    id: string
    code: string
    title: string | null
    is_active: boolean
    created_at: Date
    expires_at: Date | null
    grade: number
}
export interface RequestLog {
    id: number
    timestamp: Date
    classroom_id: string | null
    session_id: string
    mode: string
    prompt_hash: string | null
    image_attached: boolean
    tokens_input: number | null
    tokens_output: number | null
    status: number
    response_time_ms: number
    tokens_is_approximate: boolean
    error_message: string | null
}