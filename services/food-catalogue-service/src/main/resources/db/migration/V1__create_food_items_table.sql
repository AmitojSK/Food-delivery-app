CREATE TABLE food_items (
    id BIGINT NOT NULL AUTO_INCREMENT,
    restaurant_id BIGINT NOT NULL,
    name VARCHAR(140) NOT NULL,
    description VARCHAR(500),
    category VARCHAR(80) NOT NULL,
    price DECIMAL(10, 2) NOT NULL,
    available BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP(6) NOT NULL,
    updated_at TIMESTAMP(6) NOT NULL,
    CONSTRAINT pk_food_items PRIMARY KEY (id),
    INDEX idx_food_items_restaurant_id (restaurant_id),
    INDEX idx_food_items_restaurant_category (restaurant_id, category),
    INDEX idx_food_items_restaurant_available (restaurant_id, available)
);
