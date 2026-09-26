-- Forkwise: Postgres schema for AWS RDS (PostgreSQL 14+)
-- Run with: psql "host=<rds-endpoint> port=5432 dbname=forkwise user=<user> sslmode=require" -f schema.sql

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS users (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name            VARCHAR(120) NOT NULL,
    email           VARCHAR(160) NOT NULL UNIQUE,
    password_hash   VARCHAR(255) NOT NULL,
    phone           VARCHAR(20),
    role            VARCHAR(20) NOT NULL DEFAULT 'customer', -- customer | admin
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS addresses (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    label           VARCHAR(40) NOT NULL DEFAULT 'Home',
    line1           VARCHAR(200) NOT NULL,
    line2           VARCHAR(200),
    city            VARCHAR(80) NOT NULL,
    state           VARCHAR(80),
    postal_code     VARCHAR(20),
    is_default      BOOLEAN NOT NULL DEFAULT false,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS restaurants (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name            VARCHAR(160) NOT NULL,
    description     VARCHAR(400),
    cuisine         VARCHAR(80),
    image_url       VARCHAR(400),
    rating          NUMERIC(2,1) NOT NULL DEFAULT 4.5,
    eta_minutes     INT NOT NULL DEFAULT 30,
    delivery_fee    NUMERIC(6,2) NOT NULL DEFAULT 2.99,
    min_order       NUMERIC(6,2) NOT NULL DEFAULT 10.00,
    is_open         BOOLEAN NOT NULL DEFAULT true,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS menu_categories (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id   UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
    name            VARCHAR(80) NOT NULL,
    sort_order      INT NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS menu_items (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id   UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
    category_id     UUID REFERENCES menu_categories(id) ON DELETE SET NULL,
    name            VARCHAR(160) NOT NULL,
    description     VARCHAR(400),
    price           NUMERIC(8,2) NOT NULL,
    image_url       VARCHAR(400),
    is_veg          BOOLEAN NOT NULL DEFAULT false,
    is_available    BOOLEAN NOT NULL DEFAULT true,
    sort_order      INT NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS orders (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    restaurant_id   UUID NOT NULL REFERENCES restaurants(id),
    address_id      UUID REFERENCES addresses(id),
    status          VARCHAR(24) NOT NULL DEFAULT 'placed',
    -- placed -> confirmed -> preparing -> out_for_delivery -> delivered (or cancelled)
    subtotal        NUMERIC(8,2) NOT NULL,
    delivery_fee    NUMERIC(6,2) NOT NULL,
    tax             NUMERIC(6,2) NOT NULL,
    total           NUMERIC(8,2) NOT NULL,
    payment_method  VARCHAR(24) NOT NULL DEFAULT 'card',
    notes           VARCHAR(300),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS order_items (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id        UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    menu_item_id    UUID REFERENCES menu_items(id),
    name            VARCHAR(160) NOT NULL,
    price           NUMERIC(8,2) NOT NULL,
    quantity        INT NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS order_status_history (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id        UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    status          VARCHAR(24) NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_menu_items_restaurant ON menu_items(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_orders_user ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);
