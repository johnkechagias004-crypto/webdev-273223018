import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let dbInstance = null;

function getDbPath() {
  if (process.env.DB_PATH) {
    return process.env.DB_PATH;
  }
  const dataDir = path.join(__dirname, '../../data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  return path.join(dataDir, 'studycircle.sqlite');
}

export function getDatabase(dbPath = null) {
  if (dbInstance && !dbPath) {
    return dbInstance;
  }

  const targetPath = dbPath || getDbPath();
  const db = new DatabaseSync(targetPath);
  db.exec('PRAGMA foreign_keys = ON;');

  // Run migrations
  const migrationPath = path.join(__dirname, 'migrations/001_initial.sql');
  if (fs.existsSync(migrationPath)) {
    const migrationSql = fs.readFileSync(migrationPath, 'utf8');
    db.exec(migrationSql);
  }

  if (!dbPath) {
    dbInstance = db;
  }

  return db;
}

export function closeDatabase() {
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
  }
}
