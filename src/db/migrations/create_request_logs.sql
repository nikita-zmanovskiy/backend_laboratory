CREATE TABLE IF NOT EXISTS request_logs (
    id SERIAL PRIMARY KEY,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    classroom_id UUID REFERENCES classrooms(id),
    session_id VARCHAR(255) NOT NULL,
    mode VARCHAR(50) NOT NULL,
    prompt_hash VARCHAR(64),
    image_attached BOOLEAN NOT NULL DEFAULT FALSE,
    tokens_input INTEGER,
    tokens_output INTEGER,
    status INTEGER NOT NULL,
    response_time_ms INTEGER NOT NULL,
    error_message TEXT
    );
ALTER TABLE request_logs
ADD COLUMN IF NOT EXISTS tokens_is_approximate BOOLEAN DEFAULT TRUE;

CREATE INDEX IF NOT EXISTS idx_request_logs_classroom_id ON request_logs(classroom_id);
CREATE INDEX IF NOT EXISTS idx_request_logs_timestamp ON request_logs(timestamp DESC);