import express from 'express';
import * as authService from '../services/authService.js';

const router = express.Router();

router.post('/register', async (req, res) => {
  try {
    const { email, password } = req.body;
    const result = authService.registerUser(email, password, req.db);
    res.status(201).json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const result = authService.loginUser(email, password, req.db);
    req.session = req.session || {};
    req.session.user = result.user;
    if (result.user && result.user.id && req.app && req.app.locals && req.app.locals.sessions) {
      req.app.locals.sessions.set(`user-session-${result.user.id}`, req.session);
    }
    res.json({ message: result.message, user: result.user });
  } catch (err) {
    res.status(401).json({ error: err.message });
  }
});

router.post('/google', async (req, res) => {
  try {
    const { idToken, profile } = req.body;
    let googleProfile = profile;
    if (idToken) {
      googleProfile = await authService.verifyGoogleToken(idToken);
    }
    const result = authService.googleSignIn(googleProfile, req.db);
    req.session = req.session || {};
    req.session.user = result.user;
    if (result.user && result.user.id && req.app && req.app.locals && req.app.locals.sessions) {
      req.app.locals.sessions.set(`user-session-${result.user.id}`, req.session);
    }
    res.json({ message: result.message, user: result.user });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.post('/link-google', async (req, res) => {
  try {
    if (!req.session || !req.session.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const { idToken, profile } = req.body;
    let googleProfile = profile;
    if (idToken) {
      googleProfile = await authService.verifyGoogleToken(idToken);
    }
    const result = authService.linkGoogleAccount(req.session.user.id, googleProfile, req.db);
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.post('/logout', (req, res) => {
  if (req.session) {
    req.session.user = null;
  }
  res.json({ message: 'Logged out successfully' });
});

export default router;
