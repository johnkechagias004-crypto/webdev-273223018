import { getDatabase } from '../db/database.js';

export function createUser(email, passwordHash = null, db = null) {
  const database = db || getDatabase();
  const stmt = database.prepare('INSERT INTO users (email, password_hash) VALUES (?, ?)');
  const result = stmt.run(email, passwordHash);
  return Number(result.lastInsertRowid);
}

export function findUserByEmail(email, db = null) {
  const database = db || getDatabase();
  const stmt = database.prepare('SELECT * FROM users WHERE email = ?');
  return stmt.get(email);
}

export function findUserById(id, db = null) {
  const database = db || getDatabase();
  const stmt = database.prepare('SELECT * FROM users WHERE id = ?');
  return stmt.get(id);
}

export function createAuthProvider(userId, provider, providerUserId, verified = 1, db = null) {
  const database = db || getDatabase();
  const stmt = database.prepare(
    'INSERT INTO auth_providers (user_id, provider, provider_user_id, verified) VALUES (?, ?, ?, ?)'
  );
  const result = stmt.run(userId, provider, providerUserId, verified ? 1 : 0);
  return Number(result.lastInsertRowid);
}

export function findAuthProvider(provider, providerUserId, db = null) {
  const database = db || getDatabase();
  const stmt = database.prepare('SELECT * FROM auth_providers WHERE provider = ? AND provider_user_id = ?');
  return stmt.get(provider, providerUserId);
}

export function getAuthProvidersForUser(userId, db = null) {
  const database = db || getDatabase();
  const stmt = database.prepare('SELECT * FROM auth_providers WHERE user_id = ?');
  return stmt.all(userId);
}
