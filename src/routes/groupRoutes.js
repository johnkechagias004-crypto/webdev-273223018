import express from 'express';
import * as groupService from '../services/groupService.js';

const router = express.Router();

function requireAuth(req, res, next) {
  if (!req.session || !req.session.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
}

router.get('/', (req, res) => {
  try {
    const user = req.session && req.session.user ? req.session.user : null;
    const filters = {
      subject: req.query.subject,
      search: req.query.search,
      mine: req.query.mine === 'true'
    };
    const groups = groupService.listGroups(filters, user, req.db);
    res.json(groups);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', (req, res) => {
  try {
    const user = req.session && req.session.user ? req.session.user : null;
    const group = groupService.getGroupDetails(req.params.id, user, req.db);
    res.json(group);
  } catch (err) {
    res.status(404).json({ error: err.message });
  }
});

router.post('/', requireAuth, (req, res) => {
  try {
    const group = groupService.createGroup(req.body, req.session.user, req.db);
    res.status(201).json(group);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.put('/:id', requireAuth, (req, res) => {
  try {
    const group = groupService.updateGroup(req.params.id, req.body, req.session.user, req.db);
    res.json(group);
  } catch (err) {
    const status = err.message.includes('Forbidden') ? 403 : err.message.includes('not found') ? 404 : 400;
    res.status(status).json({ error: err.message });
  }
});

router.post('/:id/join', requireAuth, (req, res) => {
  try {
    const result = groupService.joinGroup(req.params.id, req.session.user, req.db);
    res.status(200).json(result);
  } catch (err) {
    const status = err.message === 'This group is full' ? 400 : err.message.includes('not found') ? 404 : 400;
    res.status(status).json({ error: err.message });
  }
});

router.post('/:id/leave', requireAuth, (req, res) => {
  try {
    const result = groupService.leaveGroup(req.params.id, req.session.user, req.db);
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.delete('/:id', requireAuth, (req, res) => {
  try {
    const result = groupService.deleteGroup(req.params.id, req.session.user, req.db);
    res.json(result);
  } catch (err) {
    const status = err.message.includes('Forbidden') ? 403 : err.message.includes('not found') ? 404 : 400;
    res.status(status).json({ error: err.message });
  }
});

export default router;
