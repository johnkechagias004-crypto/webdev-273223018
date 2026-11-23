import test from 'node:test';
import assert from 'node:assert';
import { generateGroupDescription } from './aiService.js';

test('aiService generates default fallback when API key is missing without notes', async () => {
  const result = await generateGroupDescription('Mathematics', 'Learn calculus', null, null);
  assert.ok(result.description.includes('Mathematics'));
  assert.ok(result.studyPlan.includes('none'));
});

test('aiService handles API error and returns fallback', async () => {
  const originalFetch = global.fetch;
  global.fetch = async () => {
    throw new Error('Network failure');
  };

  try {
    const result = await generateGroupDescription('Physics', 'Understand quantum mechanics', '', 'fake_key');
    assert.ok(result.description.includes('Physics'));
    assert.ok(result.studyPlan.includes('Manual input allowed'));
  } finally {
    global.fetch = originalFetch;
  }
});

test('aiService handles non-ok response and returns fallback', async () => {
  const originalFetch = global.fetch;
  global.fetch = async () => ({
    ok: false,
    status: 500
  });

  try {
    const result = await generateGroupDescription('Chemistry', 'Organic chemistry', '', 'fake_key');
    assert.ok(result.description.includes('Chemistry'));
  } finally {
    global.fetch = originalFetch;
  }
});

test('aiService handles successful API response with text', async () => {
  const originalFetch = global.fetch;
  global.fetch = async () => ({
    ok: true,
    json: async () => ({
      candidates: [{
        content: {
          parts: [{ text: 'AI generated study group description' }]
        }
      }]
    })
  });

  try {
    const result = await generateGroupDescription('Biology', 'Genetics', '', 'fake_key');
    assert.strictEqual(result.description, 'AI generated study group description');
  } finally {
    global.fetch = originalFetch;
  }
});

test('aiService handles successful API response without text (empty)', async () => {
  const originalFetch = global.fetch;
  global.fetch = async () => ({
    ok: true,
    json: async () => ({
      candidates: [{
        content: {
          parts: [{ text: '' }]
        }
      }]
    })
  });

  try {
    const result = await generateGroupDescription('History', 'WWII', '', 'fake_key');
    assert.ok(result.description.includes('Fallback description'));
  } finally {
    global.fetch = originalFetch;
  }
});

test('aiService handles timeout / abort error', async () => {
  const originalFetch = global.fetch;
  global.fetch = async (url, options) => {
    if (options && options.signal) {
      options.signal.addEventListener('abort', () => {});
    }
    const err = new Error('The operation was aborted');
    err.name = 'AbortError';
    throw err;
  };

  try {
    const result = await generateGroupDescription('Math', 'Calculus', '', 'fake_key');
    assert.ok(result.description.includes('Fallback description'));
  } finally {
    global.fetch = originalFetch;
  }
});
