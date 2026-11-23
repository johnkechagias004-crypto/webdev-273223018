import test from 'node:test';
import assert from 'node:assert';
import { getDatabase, closeDatabase } from '../db/database.js';
import { createUser } from './userRepository.js';
import {
  createGroup,
  listGroups,
  findGroupById,
  updateGroup,
  deleteGroup,
  addMembership,
  removeMembership,
  getMembershipsForGroup,
  getMembershipsForUser,
} from './groupRepository.js';

test('database repository and membership tests', async (t) => {
  // Use in-memory database for tests
  const db = getDatabase(':memory:');

  const userId1 = createUser('alice@example.com', 'hash1', db);
  const userId2 = createUser('bob@example.com', 'hash2', db);

  await t.test('group creation and listing', () => {
    const groupId = createGroup('Study Group 1', 'Math', 'Calculus study', 2, userId1, db);
    assert.ok(groupId > 0);

    const group = findGroupById(groupId, db);
    assert.strictEqual(group.title, 'Study Group 1');
    assert.strictEqual(group.subject, 'Math');
    assert.strictEqual(group.capacity, 2);
    assert.strictEqual(group.owner_id, userId1);
    assert.strictEqual(group.member_count, 0);

    const groups = listGroups({}, db);
    assert.strictEqual(groups.length, 1);
  });

  await t.test('joining group and duplicate membership prevention', () => {
    const groupId = createGroup('Study Group 2', 'Physics', 'Mechanics', 2, userId1, db);

    // Join once
    const m1 = addMembership(groupId, userId2, db);
    assert.ok(m1 > 0);

    const group = findGroupById(groupId, db);
    assert.strictEqual(group.member_count, 1);

    // Join duplicate (should return existing membership ID and not increase count)
    const m2 = addMembership(groupId, userId2, db);
    assert.strictEqual(m1, m2);

    const groupAfterDuplicate = findGroupById(groupId, db);
    assert.strictEqual(groupAfterDuplicate.member_count, 1);
  });

  await t.test('joining full group throws error', () => {
    const groupId = createGroup('Small Group', 'Chemistry', 'Lab', 1, userId1, db);

    // Owner or user joins to fill capacity (capacity = 1)
    addMembership(groupId, userId1, db);

    const fullGroup = findGroupById(groupId, db);
    assert.strictEqual(fullGroup.member_count, 1);

    // Try joining full group as another user
    assert.throws(() => {
      addMembership(groupId, userId2, db);
    }, /Group is full/);
  });

  await t.test('leaving group removes membership', () => {
    const groupId = createGroup('Leaving Group', 'History', 'World', 3, userId1, db);
    addMembership(groupId, userId2, db);

    let group = findGroupById(groupId, db);
    assert.strictEqual(group.member_count, 1);

    const removed = removeMembership(groupId, userId2, db);
    assert.strictEqual(removed, true);

    group = findGroupById(groupId, db);
    assert.strictEqual(group.member_count, 0);

    // Removing again returns false
    const removedAgain = removeMembership(groupId, userId2, db);
    assert.strictEqual(removedAgain, false);
  });

  await t.test('prevent capacity updates below current membership count', () => {
    const groupId = createGroup('Capacity Group', 'Art', 'Drawing', 3, userId1, db);
    addMembership(groupId, userId1, db);
    addMembership(groupId, userId2, db);

    const group = findGroupById(groupId, db);
    assert.strictEqual(group.member_count, 2);

    // Trying to reduce capacity below 2 (e.g. to 1) should throw an error
    assert.throws(() => {
      updateGroup(groupId, userId1, { capacity: 1 }, db);
    }, /Capacity cannot be below current membership count/);

    // Reducing capacity to 2 or increasing should succeed
    const updated = updateGroup(groupId, userId1, { capacity: 2 }, db);
    assert.strictEqual(updated, true);

    const updatedGroup = findGroupById(groupId, db);
    assert.strictEqual(updatedGroup.capacity, 2);
  });

  await t.test('group deletion by owner and authorization check', () => {
    const groupId = createGroup('Delete Me', 'Philosophy', 'Ethics', 3, userId1, db);

    // Non-owner cannot delete
    const deletedByNonOwner = deleteGroup(groupId, userId2, db);
    assert.strictEqual(deletedByNonOwner, false);
    assert.ok(findGroupById(groupId, db));

    // Owner can delete
    const deletedByOwner = deleteGroup(groupId, userId1, db);
    assert.strictEqual(deletedByOwner, true);
    assert.strictEqual(findGroupById(groupId, db), undefined);
  });
});
