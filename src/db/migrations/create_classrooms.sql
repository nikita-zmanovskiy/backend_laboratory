CREATE TABLE IF NOT EXISTS classrooms (
                                          id UUID PRIMARY KEY,
                                          code VARCHAR(32) UNIQUE NOT NULL,
    title TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NULL,
    grade INTEGER DEFAULT 11,
    teacher_token VARCHAR(64)
    );