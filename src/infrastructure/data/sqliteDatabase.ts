import * as SQLite from 'expo-sqlite';
import { File } from 'expo-file-system';
import type { User } from '@/domain/entities/User';
import { generateId } from '@/shared/utils/generateId';

let databasePromise: Promise<SQLite.SQLiteDatabase> | undefined;
let transactionQueue: Promise<void> = Promise.resolve();

const schema = `
PRAGMA foreign_keys = ON;
PRAGMA journal_mode = WAL;

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY NOT NULL,
  full_name TEXT NOT NULL CHECK (length(trim(full_name)) BETWEEN 2 AND 100),
  email TEXT NOT NULL COLLATE NOCASE UNIQUE,
  phone_country TEXT NOT NULL CHECK (length(phone_country) = 2),
  phone_dial_code TEXT NOT NULL,
  phone_number TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE IF NOT EXISTS addresses (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  recipient TEXT NOT NULL,
  phone TEXT NOT NULL,
  line1 TEXT NOT NULL,
  city TEXT NOT NULL,
  region TEXT,
  postal_code TEXT,
  country_code TEXT NOT NULL CHECK (length(country_code) = 2),
  is_default INTEGER NOT NULL DEFAULT 0 CHECK (is_default IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  UNIQUE (id, user_id)
);
CREATE INDEX IF NOT EXISTS addresses_user_id_idx ON addresses (user_id);
CREATE UNIQUE INDEX IF NOT EXISTS addresses_one_default_per_user_uq
  ON addresses (user_id) WHERE is_default = 1;

CREATE TABLE IF NOT EXISTS categories (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL UNIQUE,
  product_type TEXT NOT NULL CHECK (product_type IN ('drone', 'accessory', 'spare_part')),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  UNIQUE (id, product_type)
);

CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY NOT NULL,
  category_id TEXT NOT NULL,
  sku TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  product_type TEXT NOT NULL CHECK (product_type IN ('drone', 'accessory', 'spare_part')),
  brand TEXT,
  price REAL NOT NULL CHECK (price >= 0),
  compare_at_price REAL CHECK (compare_at_price IS NULL OR compare_at_price > price),
  currency TEXT NOT NULL DEFAULT 'USD' CHECK (length(currency) = 3),
  stock_quantity INTEGER NOT NULL DEFAULT 0 CHECK (stock_quantity >= 0),
  stock_base_quantity INTEGER,
  is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
  is_featured INTEGER NOT NULL DEFAULT 0 CHECK (is_featured IN (0, 1)),
  is_home_visible INTEGER NOT NULL DEFAULT 1 CHECK (is_home_visible IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  FOREIGN KEY (category_id, product_type) REFERENCES categories (id, product_type) ON DELETE RESTRICT
);
CREATE INDEX IF NOT EXISTS products_category_active_idx ON products (category_id, is_active);
CREATE INDEX IF NOT EXISTS products_active_type_idx ON products (product_type, is_active);
CREATE INDEX IF NOT EXISTS products_active_price_idx ON products (price) WHERE is_active = 1;
CREATE INDEX IF NOT EXISTS products_active_recent_idx ON products (created_at DESC) WHERE is_active = 1;
CREATE INDEX IF NOT EXISTS products_active_offer_idx ON products (compare_at_price)
  WHERE is_active = 1 AND compare_at_price IS NOT NULL;
CREATE INDEX IF NOT EXISTS products_featured_active_idx ON products (is_featured, is_active)
  WHERE is_featured = 1;

CREATE TABLE IF NOT EXISTS drone_specs (
  product_id TEXT PRIMARY KEY NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  max_flight_minutes INTEGER NOT NULL CHECK (max_flight_minutes > 0)
);
CREATE INDEX IF NOT EXISTS drone_specs_max_flight_idx ON drone_specs (max_flight_minutes);

CREATE TABLE IF NOT EXISTS product_images (
  id TEXT PRIMARY KEY NOT NULL,
  product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  alt_text TEXT NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 0 CHECK (display_order >= 0),
  is_primary INTEGER NOT NULL DEFAULT 0 CHECK (is_primary IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  UNIQUE (product_id, display_order)
);
CREATE UNIQUE INDEX IF NOT EXISTS product_images_one_primary_per_product_uq
  ON product_images (product_id) WHERE is_primary = 1;

CREATE TABLE IF NOT EXISTS product_reviews (
  id TEXT PRIMARY KEY NOT NULL,
  product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  review_text TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  UNIQUE (product_id, user_id)
);
CREATE INDEX IF NOT EXISTS product_reviews_product_rating_idx ON product_reviews (product_id, rating);

CREATE TABLE IF NOT EXISTS carts (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE IF NOT EXISTS cart_items (
  cart_id TEXT NOT NULL REFERENCES carts(id) ON DELETE CASCADE,
  product_id TEXT NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  added_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  PRIMARY KEY (cart_id, product_id)
);
CREATE INDEX IF NOT EXISTS cart_items_product_id_idx ON cart_items (product_id);

CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  shipping_address_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'paid', 'shipped', 'delivered', 'cancelled')),
  sync_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (sync_status IN ('pending', 'synced', 'error')),
  sync_error TEXT,
  receipt_local_uri TEXT,
  receipt_storage_path TEXT,
  payment_method TEXT CHECK (payment_method IS NULL OR payment_method IN ('yape', 'visa')),
  currency TEXT NOT NULL CHECK (length(currency) = 3),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  FOREIGN KEY (shipping_address_id, user_id) REFERENCES addresses (id, user_id) ON DELETE RESTRICT
);
CREATE INDEX IF NOT EXISTS orders_user_created_idx ON orders (user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS order_items (
  id TEXT PRIMARY KEY NOT NULL,
  order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id TEXT REFERENCES products(id) ON DELETE SET NULL,
  product_name TEXT NOT NULL,
  sku TEXT NOT NULL,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  unit_price REAL NOT NULL CHECK (unit_price >= 0),
  UNIQUE (order_id, sku)
);
CREATE INDEX IF NOT EXISTS order_items_product_id_idx ON order_items (product_id);
`;

export function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (!databasePromise) {
    databasePromise = SQLite.openDatabaseAsync('skynova.db')
      .then(async (database) => {
        await database.execAsync(schema);
        const userColumns = await database.getAllAsync<{ name: string }>('PRAGMA table_info(users)');
        if (userColumns.some((column) => column.name === 'username')) {
          await database.execAsync('PRAGMA foreign_keys = OFF');
          try {
            await withDatabaseTransaction(database, async () => {
              await database.execAsync(`CREATE TABLE users_without_username (
                id TEXT PRIMARY KEY NOT NULL,
                full_name TEXT NOT NULL CHECK (length(trim(full_name)) BETWEEN 2 AND 100),
                email TEXT NOT NULL COLLATE NOCASE UNIQUE,
                phone_country TEXT NOT NULL CHECK (length(phone_country) = 2),
                phone_dial_code TEXT NOT NULL,
                phone_number TEXT NOT NULL,
                created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
                updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
              )`);
              await database.runAsync(`INSERT INTO users_without_username (
                id, full_name, email, phone_country, phone_dial_code, phone_number, created_at, updated_at
              )
              SELECT id, full_name, email, phone_country, phone_dial_code, phone_number, created_at, updated_at
              FROM users`);
              await database.execAsync('DROP TABLE users');
              await database.execAsync('ALTER TABLE users_without_username RENAME TO users');
            });
          } finally {
            await database.execAsync('PRAGMA foreign_keys = ON');
          }
        }
        const orderColumns = await database.getAllAsync<{ name: string }>('PRAGMA table_info(orders)');
        const existingColumns = new Set(orderColumns.map((column) => column.name));
        if (!existingColumns.has('sync_status')) {
          //noinspection SqlNoDataSourceInspection
          await database.execAsync("ALTER TABLE orders ADD COLUMN sync_status TEXT NOT NULL DEFAULT 'pending'");
        }
        if (!existingColumns.has('sync_error')) {
          //noinspection SqlNoDataSourceInspection
          await database.execAsync('ALTER TABLE orders ADD COLUMN sync_error TEXT');
        }
        if (!existingColumns.has('receipt_local_uri')) {
          //noinspection SqlNoDataSourceInspection
          await database.execAsync('ALTER TABLE orders ADD COLUMN receipt_local_uri TEXT');
        }
        if (!existingColumns.has('receipt_storage_path')) {
          //noinspection SqlNoDataSourceInspection
          await database.execAsync('ALTER TABLE orders ADD COLUMN receipt_storage_path TEXT');
        }
        if (!existingColumns.has('payment_method')) {
          //noinspection SqlNoDataSourceInspection
          await database.execAsync('ALTER TABLE orders ADD COLUMN payment_method TEXT');
        }
        if (!existingColumns.has('payment_details')) {
          //noinspection SqlNoDataSourceInspection
          await database.execAsync('ALTER TABLE orders ADD COLUMN payment_details TEXT');
        }
        const productColumns = await database.getAllAsync<{ name: string }>('PRAGMA table_info(products)');
        if (!productColumns.some((column) => column.name === 'stock_base_quantity')) {
          //noinspection SqlNoDataSourceInspection
          await database.execAsync('ALTER TABLE products ADD COLUMN stock_base_quantity INTEGER');
          await database.runAsync('UPDATE products SET stock_base_quantity = stock_quantity WHERE stock_base_quantity IS NULL');
        }
        await withDatabaseTransaction(database, async () => {
          await database.runAsync("DELETE FROM orders WHERE user_id = 'demo-user'");
          await database.runAsync("DELETE FROM users WHERE id = 'demo-user'");
        });
        return database;
      })
      .catch((error: unknown) => {
        databasePromise = undefined;
        throw error;
      });
  }
  return databasePromise;
}

export async function cacheUserProfile(user: User) {
  const database = await getDatabase();
  //noinspection SqlNoDataSourceInspection
  await database.runAsync(
    `INSERT INTO users (id, full_name, email, phone_country, phone_dial_code, phone_number, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET full_name = excluded.full_name, email = excluded.email,
       phone_country = excluded.phone_country,
       phone_dial_code = excluded.phone_dial_code, phone_number = excluded.phone_number,
       updated_at = ?`,
    user.id,
    user.fullName,
    user.email,
    user.phone.countryCode,
    user.phone.dialCode,
    user.phone.number,
    user.createdAt,
    new Date().toISOString(),
  );
}

export async function getCachedUserProfile(userId: string): Promise<User | null> {
  const database = await getDatabase();
  //noinspection SqlNoDataSourceInspection
  const row = await database.getFirstAsync<{
    id: string;
    full_name: string;
    email: string;
    phone_country: string;
    phone_dial_code: string;
    phone_number: string;
    created_at: string;
  }>(
    `SELECT id, full_name, email, phone_country, phone_dial_code, phone_number, created_at
     FROM users WHERE id = ?`,
    userId,
  );
  if (!row) return null;
  return {
    id: row.id,
    fullName: row.full_name,
    email: row.email,
    phone: {
      countryCode: row.phone_country,
      dialCode: row.phone_dial_code,
      number: row.phone_number,
    },
    createdAt: row.created_at,
  };
}

export async function deleteLocalAccountData(userId: string) {
  const database = await getDatabase();
  const receipts = await database.getAllAsync<{ receipt_local_uri: string | null }>(
    'SELECT receipt_local_uri FROM orders WHERE user_id = ? AND receipt_local_uri IS NOT NULL',
    userId,
  );
  await withDatabaseTransaction(database, async () => {
    await database.runAsync('DELETE FROM orders WHERE user_id = ?', userId);
    await database.runAsync('DELETE FROM users WHERE id = ?', userId);
  });
  for (const { receipt_local_uri: uri } of receipts) {
    if (!uri?.startsWith('file://')) continue;
    const receipt = new File(uri);
    if (receipt.exists) receipt.delete();
  }
}

export function withDatabaseTransaction(
  database: SQLite.SQLiteDatabase,
  task: () => Promise<void>,
): Promise<void> {
  const transaction = transactionQueue.then(() => database.withTransactionAsync(task));
  transactionQueue = transaction.then(() => undefined, () => undefined);
  return transaction;
}

export function newCartId(userId: string) {
  return `cart_${userId || generateId()}`;
}
