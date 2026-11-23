import * as groupRepo from '../repositories/groupRepository.js';

export function listGroups(filters = {}, user = null, db = null) {
  let actualUser = user;
  let actualDb = db;
  if (user && typeof user.prepare === 'function') {
    actualDb = user;
    actualUser = null;
  }
  const groups = groupRepo.listGroups(filters, actualUser, actualDb);
  return groups.map(g => ({
    ...g,
    isMember: actualUser && actualUser.id ? !!groupRepo.findMembership(g.id, actualUser.id, actualDb) : false
  }));
}

export function getGroupDetails(groupId, user = null, db = null) {
  let actualUser = user;
  let actualDb = db;
  if (user && typeof user.prepare === 'function') {
    actualDb = user;
    actualUser = null;
  }
  const group = groupRepo.findGroupById(groupId, actualDb);
  if (!group) {
    throw new Error('Group not found');
  }
  const isMember = actualUser && actualUser.id ? !!groupRepo.findMembership(groupId, actualUser.id, actualDb) : false;
  return {
    ...group,
    isMember
  };
}

export function createGroup(data, user, db = null) {
  if (!user || !user.id) {
    throw new Error('Unauthorized');
  }
  if (!data.title || !data.subject || data.capacity === undefined) {
    throw new Error('Title, subject and capacity are required');
  }
  if (typeof data.capacity !== 'number' || data.capacity <= 0) {
    throw new Error('Capacity must be a positive number');
  }

  const groupId = groupRepo.createGroup(
    data.title,
    data.subject,
    data.description || '',
    data.capacity,
    user.id,
    db
  );
  return groupRepo.findGroupById(groupId, db);
}

export function updateGroup(groupId, data, user, db = null) {
  if (!user || !user.id) {
    throw new Error('Unauthorized');
  }
  const group = groupRepo.findGroupById(groupId, db);
  if (!group) {
    throw new Error('Group not found');
  }
  if (group.owner_id !== user.id) {
    throw new Error('Forbidden: only group owner can edit');
  }

  groupRepo.updateGroup(groupId, user.id, data, db);
  return groupRepo.findGroupById(groupId, db);
}

export function joinGroup(groupId, user, db = null) {
  if (!user || !user.id) {
    throw new Error('Unauthorized');
  }
  const group = groupRepo.findGroupById(groupId, db);
  if (!group) {
    throw new Error('Group not found');
  }

  try {
    const membershipId = groupRepo.addMembership(groupId, user.id, db);
    return { success: true, membershipId };
  } catch (err) {
    if (err.message === 'Group is full') {
      throw new Error('This group is full');
    }
    throw err;
  }
}

export function leaveGroup(groupId, user, db = null) {
  if (!user || !user.id) {
    throw new Error('Unauthorized');
  }
  const group = groupRepo.findGroupById(groupId, db);
  if (!group) {
    throw new Error('Group not found');
  }

  const removed = groupRepo.removeMembership(groupId, user.id, db);
  if (!removed) {
    throw new Error('Membership not found');
  }
  return { success: true };
}

export function deleteGroup(groupId, user, db = null) {
  if (!user || !user.id) {
    throw new Error('Unauthorized');
  }
  const group = groupRepo.findGroupById(groupId, db);
  if (!group) {
    throw new Error('Group not found');
  }
  if (group.owner_id !== user.id) {
    throw new Error('Forbidden: only group owner can delete');
  }

  groupRepo.deleteGroup(groupId, user.id, db);
  return { success: true };
}
