CREATE TABLE delivery_inbox (
    event_id VARCHAR(100) NOT NULL,
    processed_at TIMESTAMP(6) NOT NULL,
    CONSTRAINT pk_delivery_inbox PRIMARY KEY (event_id)
);
