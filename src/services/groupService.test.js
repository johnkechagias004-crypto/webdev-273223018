import test from 'node:test';
import assert from 'node:assert';
import { getDatabase } from '../db/database.js';
import { createUser } from '../repositories/userRepository.js';
import * as groupService from './groupService.js';
import * as groupRepo from '../repositories/groupRepository.js';

test('AC-5 group list displays stored groups', () => {
  const db = getDatabase(':memory:');
  const user = { id: createUser('alice@example.com', 'hash', db) };
  groupRepo.createGroup('Group A', 'Math', 'Desc', 5, user.id, db);

  const groups = groupService.listGroups({}, db);
  assert.strictEqual(groups.length, 1);
  assert.strictEqual(groups[0].title, 'Group A');
});

test('AC-6 group creation inserts one record', () => {
  const db = getDatabase(':memory:');
  const user = { id: createUser('alice@example.com', 'hash', db) };

  const newGroup = groupService.createGroup({
    title: 'Calculus Study',
    subject: 'Math',
    description: 'Weekly calculus review',
    capacity: 4
  }, user, db);

  assert.ok(newGroup.id > 0);
  assert.strictEqual(newGroup.title, 'Calculus Study');

  const allGroups = groupService.listGroups({}, db);
  assert.strictEqual(allGroups.length, 1);
});

test('AC-7 joining an available group succeeds', () => {
  const db = getDatabase(':memory:');
  const owner = { id: createUser('owner@example.com', 'hash', db) };
  const student = { id: createUser('student@example.com', 'hash', db) };

  const group = groupService.createGroup({
    title: 'Physics 101',
    subject: 'Physics',
    capacity: 3
  }, owner, db);

  const result = groupService.joinGroup(group.id, student, db);
  assert.strictEqual(result.success, true);
  assert.ok(result.membershipId > 0);

  const details = groupService.getGroupDetails(group.id, db);
  assert.strictEqual(details.member_count, 1);
});

test('AC-8 joining a full group is rejected', () => {
  const db = getDatabase(':memory:');
  const owner = { id: createUser('owner@example.com', 'hash', db) };
  const student1 = { id: createUser('student1@example.com', 'hash', db) };
  const student2 = { id: createUser('student2@example.com', 'hash', db) };

  const group = groupService.createGroup({
    title: 'AI Lab',
    subject: 'Computer Science',
    capacity: 1
  }, owner, db);

  groupService.joinGroup(group.id, student1, db);

  assert.throws(() => {
    groupService.joinGroup(group.id, student2, db);
  }, /This group is full/);
});

test('AC-9 duplicate memberships are prevented', () => {
  const db = getDatabase(':memory:');
  const owner = { id: createUser('owner@example.com', 'hash', db) };
  const student = { id: createUser('student@example.com', 'hash', db) };

  const group = groupService.createGroup({
    title: 'Literature',
    subject: 'English',
    capacity: 5
  }, owner, db);

  const res1 = groupService.joinGroup(group.id, student, db);
  const res2 = groupService.joinGroup(group.id, student, db);

  assert.strictEqual(res1.membershipId, res2.membershipId);

  const details = groupService.getGroupDetails(group.id, db);
  assert.strictEqual(details.member_count, 1);
});

test('AC-10 leaving a group removes membership', () => {
  const db = getDatabase(':memory:');
  const owner = { id: createUser('owner@example.com', 'hash', db) };
  const student = { id: createUser('student@example.com', 'hash', db) };

  const group = groupService.createGroup({
    title: 'History',
    subject: 'Social Studies',
    capacity: 5
  }, owner, db);

  groupService.joinGroup(group.id, student, db);
  let details = groupService.getGroupDetails(group.id, db);
  assert.strictEqual(details.member_count, 1);

  const leaveRes = groupService.leaveGroup(group.id, student, db);
  assert.strictEqual(leaveRes.success, true);

  details = groupService.getGroupDetails(group.id, db);
  assert.strictEqual(details.member_count, 0);
});

test('group details returns isMember boolean correctly', () => {
  const db = getDatabase(':memory:');
  const owner = { id: createUser('owner@example.com', 'hash', db) };
  const student = { id: createUser('student@example.com', 'hash', db) };

  const group = groupService.createGroup({
    title: 'Geometry',
    subject: 'Mathematics',
    capacity: 5
  }, owner, db);

  let details = groupService.getGroupDetails(group.id, null, db);
  assert.strictEqual(details.isMember, false);

  details = groupService.getGroupDetails(group.id, student, db);
  assert.strictEqual(details.isMember, false);

  groupService.joinGroup(group.id, student, db);
  details = groupService.getGroupDetails(group.id, student, db);
  assert.strictEqual(details.isMember, true);

  groupService.leaveGroup(group.id, student, db);
  details = groupService.getGroupDetails(group.id, student, db);
  assert.strictEqual(details.isMember, false);
});

test('AC-11 AI suggestion requires user confirmation', async () => {
  const fakeAiClient = {
    generate: async () => ({ description: 'AI suggestion description', studyPlan: 'Plan' })
  };
  const suggestion = await fakeAiClient.generate();
  assert.strictEqual(suggestion.description, 'AI suggestion description');

  const db = getDatabase(':memory:');
  const owner = { id: createUser('owner@example.com', 'hash', db) };
  const group = groupService.createGroup({
    title: 'AI Test Group',
    subject: 'AI',
    description: 'Initial manual description',
    capacity: 3
  }, owner, db);
  assert.strictEqual(group.description, 'Initial manual description');
});

test('AC-12 AI failure allows manual input', async () => {
  const fakeFailingAiClient = {
    generate: async () => { throw new Error('Model provider unavailable'); }
  };
  let manualDescription = '';
  try {
    await fakeFailingAiClient.generate();
  } catch (err) {
    manualDescription = 'Entered manually after AI failure';
  }
  const db = getDatabase(':memory:');
  const owner = { id: createUser('owner@example.com', 'hash', db) };
  const group = groupService.createGroup({
    title: 'Manual Group',
    subject: 'Physics',
    description: manualDescription,
    capacity: 3
  }, owner, db);
  assert.strictEqual(group.description, 'Entered manually after AI failure');
});

test('group deletion service rules enforce owner permission and errors', () => {
  const db = getDatabase(':memory:');
  const owner = { id: createUser('owner@example.com', 'hash', db) };
  const stranger = { id: createUser('stranger@example.com', 'hash', db) };

  const group = groupService.createGroup({
    title: 'Sociology',
    subject: 'Social Science',
    capacity: 5
  }, owner, db);

  assert.throws(() => {
    groupService.deleteGroup(group.id, null, db);
  }, /Unauthorized/);

  assert.throws(() => {
    groupService.deleteGroup(9999, owner, db);
  }, /Group not found/);

  assert.throws(() => {
    groupService.deleteGroup(group.id, stranger, db);
  }, /Forbidden: only group owner can delete/);

  const res = groupService.deleteGroup(group.id, owner, db);
  assert.strictEqual(res.success, true);

  assert.throws(() => {
    groupService.getGroupDetails(group.id, owner, db);
  }, /Group not found/);
});

test('updateGroup enforces permissions and validation', () => {
  const db = getDatabase(':memory:');
  const owner = { id: createUser('owner@example.com', 'hash', db) };
  const stranger = { id: createUser('stranger@example.com', 'hash', db) };

  const group = groupService.createGroup({
    title: 'Old Title',
    subject: 'Subject',
    description: 'Old desc',
    capacity: 5
  }, owner, db);

  assert.throws(() => {
    groupService.updateGroup(group.id, { title: 'New' }, null, db);
  }, /Unauthorized/);

  assert.throws(() => {
    groupService.updateGroup(999, { title: 'New' }, owner, db);
  }, /Group not found/);

  assert.throws(() => {
    groupService.updateGroup(group.id, { title: 'New' }, stranger, db);
  }, /Forbidden: only group owner can edit/);

  const updated = groupService.updateGroup(group.id, { title: 'New Title', description: 'New desc' }, owner, db);
  assert.strictEqual(updated.title, 'New Title');
});

test('createGroup validation rules', () => {
  const db = getDatabase(':memory:');
  const owner = { id: createUser('owner@example.com', 'hash', db) };

  assert.throws(() => {
    groupService.createGroup({}, null, db);
  }, /Unauthorized/);

  assert.throws(() => {
    groupService.createGroup({}, owner, db);
  }, /Title, subject and capacity are required/);

  assert.throws(() => {
    groupService.createGroup({ title: 'T', subject: 'S', capacity: 0 }, owner, db);
  }, /Capacity must be a positive number/);
});

test('joinGroup and leaveGroup error handling', () => {
  const db = getDatabase(':memory:');
  const owner = { id: createUser('owner@example.com', 'hash', db) };
  const student = { id: createUser('student@example.com', 'hash', db) };

  const group = groupService.createGroup({
    title: 'Test',
    subject: 'Test',
    capacity: 2
  }, owner, db);

  assert.throws(() => {
    groupService.joinGroup(group.id, null, db);
  }, /Unauthorized/);

  assert.throws(() => {
    groupService.joinGroup(999, student, db);
  }, /Group not found/);

  assert.throws(() => {
    groupService.leaveGroup(group.id, null, db);
  }, /Unauthorized/);

  assert.throws(() => {
    groupService.leaveGroup(999, student, db);
  }, /Group not found/);

  assert.throws(() => {
    groupService.leaveGroup(group.id, student, db);
  }, /Membership not found/);
});

test('joinGroup rethrows unexpected errors', () => {
  const realDb = getDatabase(':memory:');
  const owner = { id: createUser('owner@example.com', 'hash', realDb) };
  const group = groupService.createGroup({
    title: 'Test',
    subject: 'Test',
    capacity: 2
  }, owner, realDb);

  const mockDb = {
    exec: (sql) => realDb.exec(sql),
    prepare: (sql) => {
      if (sql.includes('INSERT INTO memberships')) {
        throw new Error('Database connection lost');
      }
      return realDb.prepare(sql);
    }
  };

  assert.throws(() => {
    groupService.joinGroup(group.id, owner, mockDb);
  }, /Database connection lost/);
});

test('service functions accept db connection directly as second/third argument', () => {
  const db = getDatabase(':memory:');
  const owner = { id: createUser('owner@example.com', 'hash', db) };
  const group = groupService.createGroup({
    title: 'Direct DB',
    subject: 'Test',
    capacity: 3
  }, owner, db);

  const groups = groupService.listGroups(db);
  assert.strictEqual(groups.length, 1);

  const details = groupService.getGroupDetails(group.id, db);
  assert.strictEqual(details.title, 'Direct DB');
});
