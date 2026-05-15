ALTER TABLE request_logs
    ADD COLUMN IF NOT EXISTS tokens_is_approximate BOOLEAN DEFAULT TRUE;

UPDATE request_logs
SET tokens_is_approximate = TRUE
WHERE tokens_is_approximate IS NULL;