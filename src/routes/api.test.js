import test from 'node:test';
import assert from 'node:assert';
import { createApp } from '../app.js';
import http from 'node:http';

function makeRequest(app, method, path, headers = {}, body = null) {
  return new Promise((resolve, reject) => {
    const server = http.createServer(app);
    server.listen(0, () => {
      const port = server.address().port;
      const reqHeaders = { 'Content-Type': 'application/json', ...headers };
      let bodyStr = body ? JSON.stringify(body) : null;
      if (bodyStr) {
        reqHeaders['Content-Length'] = Buffer.byteLength(bodyStr);
      }

      const req = http.request({
        hostname: 'localhost',
        port,
        path,
        method,
        headers: reqHeaders
      }, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          server.close();
          try {
            const json = data ? JSON.parse(data) : null;
            resolve({ status: res.statusCode, headers: res.headers, body: json });
          } catch (e) {
            resolve({ status: res.statusCode, headers: res.headers, body: data });
          }
        });
      });

      req.on('error', err => {
        server.close();
        reject(err);
      });

      if (bodyStr) {
        req.write(bodyStr);
      }
      req.end();
    });
  });
}

test('HTTP API authentication and group management integration tests', async (t) => {
  const dbPath = ':memory:';
  const app = createApp(dbPath);
  const sessionId = 'test-session-1';

  await t.test('POST /api/auth/register and POST /api/auth/login', async () => {
    const regRes = await makeRequest(app, 'POST', '/api/auth/register', {}, {
      email: 'api_user@example.com',
      password: 'securepassword123'
    });
    assert.strictEqual(regRes.status, 201);
    assert.strictEqual(regRes.body.user.email, 'api_user@example.com');

    const loginRes = await makeRequest(app, 'POST', '/api/auth/login', { 'x-session-id': sessionId }, {
      email: 'api_user@example.com',
      password: 'securepassword123'
    });
    assert.strictEqual(loginRes.status, 200);
    assert.strictEqual(loginRes.body.user.email, 'api_user@example.com');
  });

  let groupId;
  await t.test('POST /api/groups creates a study group when authenticated', async () => {
    const createRes = await makeRequest(app, 'POST', '/api/groups', { 'x-session-id': sessionId }, {
      title: 'Web Dev Study Group',
      subject: 'Computer Science',
      description: 'Node and Express study',
      capacity: 2
    });
    assert.strictEqual(createRes.status, 201);
    assert.ok(createRes.body.id > 0);
    groupId = createRes.body.id;
  });

  await t.test('GET /api/groups lists available groups', async () => {
    const listRes = await makeRequest(app, 'GET', '/api/groups', {});
    assert.strictEqual(listRes.status, 200);
    assert.strictEqual(listRes.body.length, 1);
    assert.strictEqual(listRes.body[0].title, 'Web Dev Study Group');
  });

  await t.test('POST /api/groups/:id/join and full group error response', async () => {
    const session2 = 'test-session-2';
    await makeRequest(app, 'POST', '/api/auth/register', {}, {
      email: 'user2@example.com',
      password: 'password123'
    });
    await makeRequest(app, 'POST', '/api/auth/login', { 'x-session-id': session2 }, {
      email: 'user2@example.com',
      password: 'password123'
    });

    const join1 = await makeRequest(app, 'POST', `/api/groups/${groupId}/join`, { 'x-session-id': session2 });
    assert.strictEqual(join1.status, 200);

    const sessionOwner = 'test-session-owner';
    await makeRequest(app, 'POST', '/api/auth/login', { 'x-session-id': sessionOwner }, {
      email: 'api_user@example.com',
      password: 'securepassword123'
    });

    const joinOwner = await makeRequest(app, 'POST', `/api/groups/${groupId}/join`, { 'x-session-id': sessionOwner });
    assert.strictEqual(joinOwner.status, 200);

    const session3 = 'test-session-3';
    await makeRequest(app, 'POST', '/api/auth/register', {}, {
      email: 'user3@example.com',
      password: 'password123'
    });
    await makeRequest(app, 'POST', '/api/auth/login', { 'x-session-id': session3 }, {
      email: 'user3@example.com',
      password: 'password123'
    });

    const joinFull = await makeRequest(app, 'POST', `/api/groups/${groupId}/join`, { 'x-session-id': session3 });
    assert.strictEqual(joinFull.status, 400);
    assert.strictEqual(joinFull.body.error, 'This group is full');
  });

  await t.test('POST /api/auth/google verifies Google token / sign-in', async () => {
    const googleRes = await makeRequest(app, 'POST', '/api/auth/google', {}, {
      idToken: 'mock_token_google123_guser@example.com'
    });
    assert.strictEqual(googleRes.status, 200);
    assert.strictEqual(googleRes.body.user.email, 'guser@example.com');
  });

  await t.test('GET /api/groups?mine=true and leaving group', async () => {
    const mineRes = await makeRequest(app, 'GET', '/api/groups?mine=true', { 'x-session-id': sessionId });
    assert.strictEqual(mineRes.status, 200);
    assert.ok(mineRes.body.some(g => g.id === groupId));

    const leaveRes = await makeRequest(app, 'POST', `/api/groups/${groupId}/leave`, { 'x-session-id': 'test-session-2' });
    assert.strictEqual(leaveRes.status, 200);
    assert.strictEqual(leaveRes.body.success, true);
  });

  await t.test('GET /api/groups/:id returns isMember true for joined user with x-user-id header', async () => {
    const sessionMember = 'member-session';
    await makeRequest(app, 'POST', '/api/auth/register', {}, {
      email: 'membertest@example.com',
      password: 'password123'
    });
    const loginRes = await makeRequest(app, 'POST', '/api/auth/login', { 'x-session-id': sessionMember }, {
      email: 'membertest@example.com',
      password: 'password123'
    });
    assert.strictEqual(loginRes.status, 200);
    const userId = loginRes.body.user.id;

    // Join group with session
    const joinRes = await makeRequest(app, 'POST', `/api/groups/${groupId}/join`, { 'x-session-id': sessionMember });
    assert.strictEqual(joinRes.status, 200);

    // Now request GET /api/groups/:id with x-user-id and x-session-id headers
    const detailsRes = await makeRequest(app, 'GET', `/api/groups/${groupId}`, {
      'x-user-id': String(userId),
      'x-session-id': sessionMember
    });
    assert.strictEqual(detailsRes.status, 200);
    assert.strictEqual(detailsRes.body.isMember, true);
  });

  await t.test('DELETE /api/groups/:id enforces owner authorization', async () => {
    // Create another group for deletion testing
    const createRes = await makeRequest(app, 'POST', '/api/groups', { 'x-session-id': sessionId }, {
      title: 'Group To Delete',
      subject: 'Art',
      capacity: 3
    });
    assert.strictEqual(createRes.status, 201);
    const deleteGroupId = createRes.body.id;

    // Try deleting as non-owner (session2)
    const deleteNonOwner = await makeRequest(app, 'DELETE', `/api/groups/${deleteGroupId}`, { 'x-session-id': 'test-session-2' });
    assert.strictEqual(deleteNonOwner.status, 403);

    // Delete as owner (sessionId)
    const deleteOwner = await makeRequest(app, 'DELETE', `/api/groups/${deleteGroupId}`, { 'x-session-id': sessionId });
    assert.strictEqual(deleteOwner.status, 200);
    assert.strictEqual(deleteOwner.body.success, true);

    // Verify group is gone
    const getRes = await makeRequest(app, 'GET', `/api/groups/${deleteGroupId}`, {});
    assert.strictEqual(getRes.status, 404);
  });
});
