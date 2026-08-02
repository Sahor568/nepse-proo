import { open } from 'sqlite';
import bcrypt from 'bcryptjs';
import { NodeSqliteDriver } from './nodeSqliteDriver.js';

export async function getDb() {
  return open({
    filename: './nepse.db',
    driver: NodeSqliteDriver as unknown as new (filename: string) => any
  });
}

export async function initDb() {
  const db = await getDb();

  // Create tables
  await db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      name          TEXT    NOT NULL,
      email         TEXT    UNIQUE NOT NULL,
      password      TEXT    DEFAULT NULL,
      mobile        TEXT    DEFAULT '',
      bio           TEXT    DEFAULT '',
      googleId      TEXT    DEFAULT NULL,
      provider      TEXT    DEFAULT 'email',
      isVerified    INTEGER DEFAULT 0,
      emailOTP      TEXT    DEFAULT NULL,
      emailOTPExpiry TEXT  DEFAULT NULL,
      smsOTP        TEXT    DEFAULT NULL,
      smsOTPExpiry  TEXT    DEFAULT NULL,
      createdAt     TEXT    DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS watchlist (
      id      INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      symbol  TEXT    NOT NULL,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE(user_id, symbol)
    );

    CREATE TABLE IF NOT EXISTS portfolio (
      id        INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id   INTEGER NOT NULL,
      symbol    TEXT    NOT NULL,
      name      TEXT    DEFAULT '',
      quantity  REAL    NOT NULL,
      buy_price REAL    NOT NULL,
      buy_date  TEXT    DEFAULT '',
      reference TEXT    DEFAULT '',
      createdAt TEXT    DEFAULT (datetime('now')),
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS transactions (
      id        INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id   INTEGER NOT NULL,
      symbol    TEXT    NOT NULL,
      quantity  REAL    NOT NULL,
      price     REAL    NOT NULL,
      type      TEXT    NOT NULL CHECK(type IN ('BUY', 'SELL')),
      createdAt TEXT    DEFAULT (datetime('now')),
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);

  // Migration: add columns that may be missing in older DBs
  const migrations = [
    `ALTER TABLE portfolio ADD COLUMN reference TEXT DEFAULT ''`,
    `ALTER TABLE portfolio ADD COLUMN name      TEXT DEFAULT ''`,
    `ALTER TABLE portfolio ADD COLUMN createdAt TEXT DEFAULT (datetime('now'))`,
    `ALTER TABLE users     ADD COLUMN mobile    TEXT DEFAULT ''`,
    `ALTER TABLE users     ADD COLUMN bio       TEXT DEFAULT ''`,
    `ALTER TABLE users     ADD COLUMN createdAt TEXT DEFAULT (datetime('now'))`,
    `ALTER TABLE users     ADD COLUMN googleId  TEXT DEFAULT NULL`,
    `ALTER TABLE users     ADD COLUMN provider  TEXT DEFAULT 'email'`,
    `ALTER TABLE users     ADD COLUMN isVerified INTEGER DEFAULT 0`,
    `ALTER TABLE users     ADD COLUMN emailOTP TEXT DEFAULT NULL`,
    `ALTER TABLE users     ADD COLUMN emailOTPExpiry TEXT DEFAULT NULL`,
    `ALTER TABLE users     ADD COLUMN smsOTP TEXT DEFAULT NULL`,
    `ALTER TABLE users     ADD COLUMN smsOTPExpiry TEXT DEFAULT NULL`,
    `ALTER TABLE users     ADD COLUMN cashBalance REAL DEFAULT 100000`,
  ];
  for (const sql of migrations) {
    try { await db.exec(sql); } catch (_) { /* column already exists */ }
  }

  // Seed a demo user if the DB is empty (hashed password: "password")
  const count = await db.get('SELECT COUNT(*) as cnt FROM users');
  if (count.cnt === 0) {
    const demoHash = await bcrypt.hash('password', 12);
    await db.run(
      `INSERT INTO users (name, email, password, mobile) VALUES (?, ?, ?, ?)`,
      ['Demo User', 'demo@example.com', demoHash, '9800000000']
    );
  }

  console.log('✅ Database ready — nepse.db');
}
