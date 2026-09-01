CREATE TABLE deliveries (
    id BIGINT NOT NULL AUTO_INCREMENT,
    order_id VARCHAR(100) NOT NULL,
    restaurant_id BIGINT NOT NULL,
    driver_id BIGINT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'PENDING',
    pickup_address VARCHAR(300) NOT NULL,
    delivery_address VARCHAR(300) NOT NULL DEFAULT '',
    driver_latitude DOUBLE NULL,
    driver_longitude DOUBLE NULL,
    assigned_at TIMESTAMP(6) NULL,
    picked_up_at TIMESTAMP(6) NULL,
    delivered_at TIMESTAMP(6) NULL,
    created_at TIMESTAMP(6) NOT NULL,
    updated_at TIMESTAMP(6) NOT NULL,
    CONSTRAINT pk_deliveries PRIMARY KEY (id),
    CONSTRAINT uk_deliveries_order_id UNIQUE (order_id)
);

CREATE INDEX idx_deliveries_driver_id ON deliveries (driver_id);
CREATE INDEX idx_deliveries_status ON deliveries (status);
