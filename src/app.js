import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import authRoutes from './routes/authRoutes.js';
import groupRoutes from './routes/groupRoutes.js';
import { getDatabase } from './db/database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function createApp(dbPath = null) {
  const app = express();
  const db = getDatabase(dbPath);

  app.use(express.json());

  const sessions = new Map();
  app.locals.sessions = sessions;
  app.use((req, res, next) => {
    req.db = db;

    const sessionId = req.headers['x-session-id'] || (req.headers['x-user-id'] ? `user-session-${req.headers['x-user-id']}` : 'default-session');
    if (!sessions.has(sessionId)) {
      sessions.set(sessionId, {});
    }
    req.session = sessions.get(sessionId);

    if (!req.session.user && req.headers['x-user-id']) {
      const userId = Number(req.headers['x-user-id']);
      try {
        const dbUser = req.db.prepare('SELECT id, email FROM users WHERE id = ?').get(userId);
        if (dbUser) {
          req.session.user = dbUser;
        }
      } catch (e) {}
    }

    next();
  });

  app.use('/api/auth', authRoutes);
  app.use('/api/groups', groupRoutes);

  app.use(express.static(path.join(__dirname, '../dist')));
  app.get(/(.*)/, (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/health')) {
      return next();
    }
    res.sendFile(path.join(__dirname, '../dist/index.html'), err => {
      if (err) next();
    });
  });

  app.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok' });
  });

  app.use((err, req, res, next) => {
    res.status(500).json({ error: err.message });
  });

  return app;
}
