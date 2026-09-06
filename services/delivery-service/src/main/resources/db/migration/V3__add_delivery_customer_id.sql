-- Records which customer the delivery belongs to, so delivery-service can authorize
-- customer tracking without calling back into order-service.
--
-- Nullable on purpose: deliveries created before this column existed have no customer,
-- and the ADMIN-only POST /api/v1/deliveries endpoint does not supply one. Authorization
-- treats a NULL customer_id as "no customer may read this", which fails closed.
ALTER TABLE deliveries
    ADD COLUMN customer_id BIGINT NULL;

CREATE INDEX idx_deliveries_customer_id ON deliveries (customer_id);
