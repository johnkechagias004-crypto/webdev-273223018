import test from 'node:test';
import assert from 'node:assert';
import https from 'node:https';
import { getDatabase } from '../db/database.js';
import * as authService from './authService.js';
import * as userRepo from '../repositories/userRepository.js';

test('AC-1 valid registration stores a hashed password', () => {
  const db = getDatabase(':memory:');
  const res = authService.registerUser('student@example.com', 'secret123', db);

  assert.strictEqual(res.message, 'Registration successful');
  assert.ok(res.user.id > 0);
  assert.strictEqual(res.user.email, 'student@example.com');
  assert.notStrictEqual(res.user.password_hash, 'secret123');
  assert.ok(res.user.password_hash.includes(':'));

  const userRecord = userRepo.findUserByEmail('student@example.com', db);
  assert.ok(userRecord.password_hash);
});

test('AC-2 invalid login does not create a session', () => {
  const db = getDatabase(':memory:');
  authService.registerUser('student@example.com', 'secret123', db);

  assert.throws(() => {
    authService.loginUser('student@example.com', 'wrongpassword', db);
  }, /Invalid credentials/);

  assert.throws(() => {
    authService.loginUser('nonexistent@example.com', 'secret123', db);
  }, /Invalid credentials/);

  assert.throws(() => {
    authService.loginUser('', '', db);
  }, /Invalid credentials/);
});

test('AC-3 Google sign-in creates or retrieves a user', () => {
  const db = getDatabase(':memory:');
  
  const mockGoogleProfile = {
    providerUserId: 'google_123456',
    email: 'googleuser@example.com',
    verified: true
  };

  const res = authService.googleSignIn(mockGoogleProfile, db);
  assert.strictEqual(res.message, 'Google sign-in successful');
  assert.ok(res.user.id > 0);
  assert.strictEqual(res.user.email, 'googleuser@example.com');
  assert.strictEqual(res.user.password_hash, null);

  const res2 = authService.googleSignIn(mockGoogleProfile, db);
  assert.strictEqual(res2.user.id, res.user.id);

  const providers = userRepo.getAuthProvidersForUser(res.user.id, db);
  assert.strictEqual(providers.length, 1);
  assert.strictEqual(providers[0].provider, 'google');
  assert.strictEqual(providers[0].provider_user_id, 'google_123456');
  assert.strictEqual(providers[0].verified, 1);
});

test('AC-4 account linking keeps one user record', () => {
  const db = getDatabase(':memory:');

  const localReg = authService.registerUser('dual@example.com', 'password123', db);
  const userId = localReg.user.id;

  const mockGoogleProfile = {
    providerUserId: 'google_dual_999',
    email: 'dual@example.com',
    verified: true
  };

  const linkRes = authService.linkGoogleAccount(userId, mockGoogleProfile, db);
  assert.strictEqual(linkRes.message, 'Google account linked successfully');

  const user = userRepo.findUserByEmail('dual@example.com', db);
  assert.strictEqual(user.id, userId);

  const allUsers = db.prepare('SELECT * FROM users WHERE email = ?').all('dual@example.com');
  assert.strictEqual(allUsers.length, 1);

  const localLogin = authService.loginUser('dual@example.com', 'password123', db);
  assert.strictEqual(localLogin.user.id, userId);

  const googleLogin = authService.googleSignIn(mockGoogleProfile, db);
  assert.strictEqual(googleLogin.user.id, userId);
});

test('verifyGoogleToken handles test mode and token parsing', async () => {
  const tokenInfo = await authService.verifyGoogleToken('mock_token_123_test@example.com');
  assert.strictEqual(tokenInfo.email, 'test@example.com');

  const defaultTokenInfo = await authService.verifyGoogleToken(null);
  assert.strictEqual(defaultTokenInfo.email, 'googleuser@example.com');
});

test('verifyGoogleToken real https.get success, error and network failure', async () => {
  const originalEnv = process.env.NODE_ENV;
  delete process.env.NODE_ENV;

  const originalGet = https.get;
  
  // Success mock
  https.get = (url, cb) => {
    const res = {
      on: (event, handler) => {
        if (event === 'data') handler(JSON.stringify({ sub: '12345', email: 'net@example.com', email_verified: true }));
        if (event === 'end') handler();
      }
    };
    cb(res);
    return { on: (e, h) => {} };
  };

  const result = await authService.verifyGoogleToken('some_token');
  assert.strictEqual(result.email, 'net@example.com');

  // Error response mock
  https.get = (url, cb) => {
    const res = {
      on: (event, handler) => {
        if (event === 'data') handler(JSON.stringify({ error: 'invalid_token' }));
        if (event === 'end') handler();
      }
    };
    cb(res);
    return { on: (e, h) => {} };
  };

  await assert.rejects(async () => {
    await authService.verifyGoogleToken('bad_token');
  }, /Invalid Google token/);

  // Invalid JSON response mock
  https.get = (url, cb) => {
    const res = {
      on: (event, handler) => {
        if (event === 'data') handler('invalid-json');
        if (event === 'end') handler();
      }
    };
    cb(res);
    return { on: (e, h) => {} };
  };

  await assert.rejects(async () => {
    await authService.verifyGoogleToken('json_token');
  }, /Failed to parse Google token response/);

  // Network error mock
  https.get = (url, cb) => {
    return {
      on: (event, handler) => {
        if (event === 'error') handler(new Error('Network error'));
      }
    };
  };

  await assert.rejects(async () => {
    await authService.verifyGoogleToken('err_token');
  }, /Network error/);

  https.get = originalGet;
  process.env.NODE_ENV = originalEnv;
});

test('linkGoogleAccount validation and error handling', () => {
  const db = getDatabase(':memory:');
  const user1 = authService.registerUser('user1@example.com', 'pass123', db);
  const user2 = authService.registerUser('user2@example.com', 'pass123', db);

  const profile = { providerUserId: 'goog_999', email: 'user1@example.com', verified: true };

  assert.throws(() => {
    authService.linkGoogleAccount(null, profile, db);
  }, /Invalid linking request/);

  const res1 = authService.linkGoogleAccount(user1.user.id, profile, db);
  assert.strictEqual(res1.message, 'Google account linked successfully');

  const res2 = authService.linkGoogleAccount(user1.user.id, profile, db);
  assert.strictEqual(res2.message, 'Google account already linked');

  assert.throws(() => {
    authService.linkGoogleAccount(user2.user.id, profile, db);
  }, /Google account already linked to another user/);
});

test('googleSignIn validation and existing email error', () => {
  const db = getDatabase(':memory:');
  
  assert.throws(() => {
    authService.googleSignIn(null, db);
  }, /Invalid Google profile/);

  assert.throws(() => {
    authService.googleSignIn({ providerUserId: '' }, db);
  }, /Invalid Google profile/);

  authService.registerUser('existing@example.com', 'pass123', db);

  assert.throws(() => {
    authService.googleSignIn({ providerUserId: 'goog_888', email: 'existing@example.com', verified: true }, db);
  }, /Account with this email already exists/);
});

test('registerUser validation errors', () => {
  const db = getDatabase(':memory:');
  assert.throws(() => {
    authService.registerUser('', 'pass', db);
  }, /Email and password are required/);

  authService.registerUser('test@example.com', 'pass', db);
  assert.throws(() => {
    authService.registerUser('test@example.com', 'pass', db);
  }, /Email already registered/);
});
