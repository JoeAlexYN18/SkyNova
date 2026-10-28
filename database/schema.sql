
CREATE TABLE users (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name       varchar(100) NOT NULL CHECK (char_length(btrim(full_name)) BETWEEN 2 AND 100),
    email           varchar(254) NOT NULL,
    username        varchar(20) NOT NULL CHECK (username ~ '^[A-Za-z0-9_-]{3,20}$'),
    password_hash   text NOT NULL,
    phone_country   char(2) NOT NULL CHECK (phone_country ~ '^[A-Z]{2}$'),
    phone_dial_code varchar(6) NOT NULL CHECK (phone_dial_code ~ '^\+[0-9]{1,4}$'),
    phone_number    varchar(20) NOT NULL CHECK (phone_number ~ '^[0-9]{4,20}$'),
    created_at      timestamptz NOT NULL DEFAULT now(),
    updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX users_email_lower_uq ON users (lower(email));
CREATE UNIQUE INDEX users_username_lower_uq ON users (lower(username));
ALTER TABLE users ADD CONSTRAINT users_email_format_ck
    CHECK (email = btrim(email) AND email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]{2,}$');

CREATE TABLE addresses (
    id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id      uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    recipient    varchar(100) NOT NULL,
    phone        varchar(30) NOT NULL,
    line1        varchar(200) NOT NULL,
    line2        varchar(200),
    city         varchar(100) NOT NULL,
    region       varchar(100),
    postal_code  varchar(20),
    country_code char(2) NOT NULL CHECK (country_code ~ '^[A-Z]{2}$'),
    is_default   boolean NOT NULL DEFAULT false,
    created_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX addresses_user_id_idx ON addresses (user_id);
CREATE UNIQUE INDEX addresses_one_default_per_user_uq ON addresses (user_id) WHERE is_default;
ALTER TABLE addresses ADD CONSTRAINT addresses_id_user_uq UNIQUE (id, user_id);

CREATE TABLE categories (
    id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name         varchar(80) NOT NULL UNIQUE,
    product_type varchar(16) NOT NULL CHECK (product_type IN ('drone', 'accessory', 'spare_part')),
    created_at   timestamptz NOT NULL DEFAULT now(),
    UNIQUE (id, product_type)
);

CREATE TABLE products (
    id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    category_id    uuid NOT NULL,
    sku            varchar(64) NOT NULL UNIQUE,
    name           varchar(160) NOT NULL,
    description    text,
    product_type   varchar(16) NOT NULL CHECK (product_type IN ('drone', 'accessory', 'spare_part')),
    brand          varchar(80),
    price          numeric(12,2) NOT NULL CHECK (price >= 0),
    compare_at_price numeric(12,2),
    currency       char(3) NOT NULL DEFAULT 'USD' CHECK (currency ~ '^[A-Z]{3}$'),
    stock_quantity integer NOT NULL DEFAULT 0 CHECK (stock_quantity >= 0),
    is_active      boolean NOT NULL DEFAULT true,
    is_featured    boolean NOT NULL DEFAULT false,
    is_home_visible boolean NOT NULL DEFAULT true,
    created_at     timestamptz NOT NULL DEFAULT now(),
    updated_at     timestamptz NOT NULL DEFAULT now(),
    CHECK (compare_at_price IS NULL OR compare_at_price > price),
    FOREIGN KEY (category_id, product_type)
        REFERENCES categories (id, product_type) ON DELETE RESTRICT
);
CREATE INDEX products_category_active_idx ON products (category_id, is_active);
CREATE INDEX products_active_type_idx ON products (product_type, is_active);
CREATE INDEX products_active_price_idx ON products (price) WHERE is_active;
CREATE INDEX products_active_recent_idx ON products (created_at DESC) WHERE is_active;
CREATE INDEX products_active_offer_idx ON products (compare_at_price)
    WHERE is_active AND compare_at_price IS NOT NULL;
CREATE INDEX products_featured_active_idx ON products (is_featured, is_active) WHERE is_featured;

CREATE TABLE drone_specs (
    product_id         uuid PRIMARY KEY REFERENCES products(id) ON DELETE CASCADE,
    max_flight_minutes smallint NOT NULL CHECK (max_flight_minutes > 0)
);
CREATE INDEX drone_specs_max_flight_idx ON drone_specs (max_flight_minutes);

CREATE TABLE product_images (
    id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id     uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    image_url      text NOT NULL,
    alt_text       varchar(200) NOT NULL,
    display_order  smallint NOT NULL DEFAULT 0 CHECK (display_order >= 0),
    is_primary     boolean NOT NULL DEFAULT false,
    created_at     timestamptz NOT NULL DEFAULT now(),
    UNIQUE (product_id, display_order)
);
CREATE UNIQUE INDEX product_images_one_primary_per_product_uq
    ON product_images (product_id) WHERE is_primary;

CREATE TABLE product_reviews (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id  uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    user_id     uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    rating      smallint NOT NULL CHECK (rating BETWEEN 1 AND 5),
    review_text text,
    created_at  timestamptz NOT NULL DEFAULT now(),
    UNIQUE (product_id, user_id)
);
CREATE INDEX product_reviews_product_rating_idx ON product_reviews (product_id, rating);

CREATE TABLE carts (
    id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id    uuid NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE cart_items (
    cart_id    uuid NOT NULL REFERENCES carts(id) ON DELETE CASCADE,
    product_id uuid NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    quantity   integer NOT NULL CHECK (quantity > 0),
    added_at   timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (cart_id, product_id)
);
CREATE INDEX cart_items_product_id_idx ON cart_items (product_id);

CREATE TABLE orders (
    id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id              uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    shipping_address_id  uuid NOT NULL,
    status               varchar(16) NOT NULL DEFAULT 'pending'
                         CHECK (status IN ('pending', 'paid', 'shipped', 'delivered', 'cancelled')),
    currency             char(3) NOT NULL CHECK (currency ~ '^[A-Z]{3}$'),
    created_at           timestamptz NOT NULL DEFAULT now(),
    updated_at           timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE orders ADD CONSTRAINT orders_shipping_address_owner_fk
    FOREIGN KEY (shipping_address_id, user_id) REFERENCES addresses (id, user_id) ON DELETE RESTRICT;
CREATE INDEX orders_user_created_idx ON orders (user_id, created_at DESC);

CREATE TABLE order_items (
    id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id       uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_id     uuid REFERENCES products(id) ON DELETE SET NULL,
    product_name   varchar(160) NOT NULL,
    sku            varchar(64) NOT NULL,
    quantity       integer NOT NULL CHECK (quantity > 0),
    unit_price     numeric(12,2) NOT NULL CHECK (unit_price >= 0),
    UNIQUE (order_id, sku)
);
CREATE INDEX order_items_product_id_idx ON order_items (product_id);

