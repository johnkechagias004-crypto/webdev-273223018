import { getDatabase } from '../db/database.js';

export function createGroup(title, subject, description, capacity, ownerId, db = null) {
  const database = db || getDatabase();
  const stmt = database.prepare(
    'INSERT INTO groups (title, subject, description, capacity, owner_id) VALUES (?, ?, ?, ?, ?)'
  );
  const result = stmt.run(title, subject, description, capacity, ownerId);
  return Number(result.lastInsertRowid);
}

export function listGroups(filters = {}, user = null, db = null) {
  let actualUser = user;
  let actualDb = db;
  if (user && typeof user.prepare === 'function') {
    actualDb = user;
    actualUser = null;
  }
  const database = actualDb || getDatabase();
  let query = 'SELECT DISTINCT g.*, u.email as owner_email, (SELECT COUNT(*) FROM memberships m WHERE m.group_id = g.id) as member_count FROM groups g JOIN users u ON g.owner_id = u.id';
  const params = [];
  const conditions = [];

  if (filters.subject) {
    conditions.push('g.subject = ?');
    params.push(filters.subject);
  }
  if (filters.search) {
    conditions.push('(g.title LIKE ? OR g.subject LIKE ?)');
    params.push(`%${filters.search}%`, `%${filters.search}%`);
  }
  if (filters.mine && actualUser && actualUser.id) {
    query += ' LEFT JOIN memberships mem ON mem.group_id = g.id';
    conditions.push('(g.owner_id = ? OR mem.user_id = ?)');
    params.push(actualUser.id, actualUser.id);
  }

  if (conditions.length > 0) {
    query += ' WHERE ' + conditions.join(' AND ');
  }

  query += ' ORDER BY g.created_at DESC';
  const stmt = database.prepare(query);
  return stmt.all(...params);
}

export function findGroupById(id, db = null) {
  const database = db || getDatabase();
  const stmt = database.prepare(
    'SELECT g.*, u.email as owner_email, (SELECT COUNT(*) FROM memberships m WHERE m.group_id = g.id) as member_count FROM groups g JOIN users u ON g.owner_id = u.id WHERE g.id = ?'
  );
  return stmt.get(Number(id));
}

export function updateGroup(id, ownerId, data, db = null) {
  const database = db || getDatabase();
  const numericId = Number(id);
  const numericOwnerId = Number(ownerId);
  // Ensure owner
  const group = findGroupById(numericId, database);
  if (!group || group.owner_id !== numericOwnerId) {
    return false;
  }

  const fields = [];
  const params = [];

  if (data.title !== undefined) {
    fields.push('title = ?');
    params.push(data.title);
  }
  if (data.subject !== undefined) {
    fields.push('subject = ?');
    params.push(data.subject);
  }
  if (data.description !== undefined) {
    fields.push('description = ?');
    params.push(data.description);
  }
  if (data.capacity !== undefined) {
    const memberCountResult = database.prepare('SELECT COUNT(*) as count FROM memberships WHERE group_id = ?').get(numericId);
    if (data.capacity < memberCountResult.count) {
      throw new Error('Capacity cannot be below current membership count');
    }
    fields.push('capacity = ?');
    params.push(data.capacity);
  }

  if (fields.length === 0) {
    return true;
  }

  params.push(numericId);
  const stmt = database.prepare(`UPDATE groups SET ${fields.join(', ')} WHERE id = ?`);
  stmt.run(...params);
  return true;
}

export function addMembership(groupId, userId, db = null) {
  const database = db || getDatabase();
  const numericGroupId = Number(groupId);
  const numericUserId = Number(userId);
  database.exec('BEGIN IMMEDIATE');
  try {
    // Check duplicate membership before capacity
    const existing = database.prepare('SELECT id FROM memberships WHERE group_id = ? AND user_id = ?').get(numericGroupId, numericUserId);
    if (existing) {
      database.exec('COMMIT');
      return existing.id;
    }

    const group = database.prepare('SELECT capacity FROM groups WHERE id = ?').get(numericGroupId);
    if (!group) {
      throw new Error('Group not found');
    }

    const countResult = database.prepare('SELECT COUNT(*) as count FROM memberships WHERE group_id = ?').get(numericGroupId);
    if (countResult.count >= group.capacity) {
      throw new Error('Group is full');
    }

    const stmt = database.prepare('INSERT INTO memberships (group_id, user_id) VALUES (?, ?)');
    const result = stmt.run(numericGroupId, numericUserId);
    database.exec('COMMIT');
    return Number(result.lastInsertRowid);
  } catch (err) {
    database.exec('ROLLBACK');
    throw err;
  }
}

export function removeMembership(groupId, userId, db = null) {
  const database = db || getDatabase();
  const stmt = database.prepare('DELETE FROM memberships WHERE group_id = ? AND user_id = ?');
  const result = stmt.run(Number(groupId), Number(userId));
  return result.changes > 0;
}

export function findMembership(groupId, userId, db = null) {
  const database = db || getDatabase();
  const stmt = database.prepare('SELECT id FROM memberships WHERE group_id = ? AND user_id = ?');
  return stmt.get(Number(groupId), Number(userId));
}

export function getMembershipsForGroup(groupId, db = null) {
  const database = db || getDatabase();
  const stmt = database.prepare(
    'SELECT m.*, u.email FROM memberships m JOIN users u ON m.user_id = u.id WHERE m.group_id = ?'
  );
  return stmt.all(groupId);
}

export function getMembershipsForUser(userId, db = null) {
  const database = db || getDatabase();
  const stmt = database.prepare(
    'SELECT m.*, g.title, g.subject FROM memberships m JOIN groups g ON m.group_id = g.id WHERE m.user_id = ?'
  );
  return stmt.all(userId);
}

export function deleteGroup(groupId, ownerId, db = null) {
  const database = db || getDatabase();
  const numericId = Number(groupId);
  const numericOwnerId = Number(ownerId);
  const group = findGroupById(numericId, database);
  if (!group || group.owner_id !== numericOwnerId) {
    return false;
  }
  const stmt = database.prepare('DELETE FROM groups WHERE id = ?');
  stmt.run(numericId);
  return true;
}
