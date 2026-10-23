-- Inbox for idempotent (effectively-once) Kafka consumption. The consumer records each handled
-- event id here and skips any it has already seen, so an at-least-once redelivery is a no-op.
CREATE TABLE catalogue_inbox (
    event_id     VARCHAR(64)  NOT NULL,
    processed_at TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (event_id)
);
