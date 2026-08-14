CREATE TABLE restaurants (
    id BIGINT NOT NULL AUTO_INCREMENT,
    name VARCHAR(140) NOT NULL,
    cuisine_type VARCHAR(80) NOT NULL,
    street_address VARCHAR(200) NOT NULL,
    city VARCHAR(100) NOT NULL,
    state VARCHAR(100) NOT NULL,
    postal_code VARCHAR(20) NOT NULL,
    contact_email VARCHAR(160) NOT NULL,
    contact_phone VARCHAR(20) NOT NULL,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP(6) NOT NULL,
    updated_at TIMESTAMP(6) NOT NULL,
    CONSTRAINT pk_restaurants PRIMARY KEY (id),
    CONSTRAINT uk_restaurants_name UNIQUE (name),
    CONSTRAINT uk_restaurants_contact_email UNIQUE (contact_email),
    CONSTRAINT uk_restaurants_contact_phone UNIQUE (contact_phone)
);
