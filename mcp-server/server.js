
const readline = require('node:readline');
const fs = require('node:fs');
const path = require('node:path');

const rl = readline.createInterface({
  input: process.stdin
});

const lecturesPath = path.join(__dirname, 'lectures.json');

function send(reply) {
  console.log(JSON.stringify(reply));
}

function respond(id, result) {
  send({ jsonrpc: '2.0', id, result });
}

function protocolError(id, code, message) {
  send({
    jsonrpc: '2.0',
    id,
    error: { code, message }
  });
}

function readLectures() {
  return JSON.parse(fs.readFileSync(lecturesPath, 'utf8'));
}

const tools = [
  {
    name: 'find_lecture',
    description: 'Use this tool when the user asks for a specific lecture number to retrieve its title and topics.',
    inputSchema: {
      type: 'object',
      properties: {
        number: {
          type: 'integer',
          minimum: 1,
          maximum: 10
        }
      },
      required: ['number']
    }
  },
  {
    name: 'search_lectures',
    description: 'Search local course lectures by a keyword in their titles or topics.',
    inputSchema: {
      type: 'object',
      properties: {
        keyword: {
          type: 'string',
          description: 'The keyword to search for.'
        }
      },
      required: ['keyword']
    }
  }
];

rl.on('line', (line) => {
  let message;

  try {
    message = JSON.parse(line);
  } catch {
    protocolError(null, -32700, 'Parse error');
    return;
  }

  if (message.method === 'notifications/initialized') {
    return;
  }

  if (message.method === 'initialize') {
    respond(message.id, {
      protocolVersion: '2025-11-25',
      capabilities: { tools: {} },
      serverInfo: {
        name: 'my-mcp-server',
        version: '1.0.0'
      }
    });
    return;
  }

  if (message.method === 'tools/list') {
    respond(message.id, { tools });
    return;
  }

  if (message.method === 'tools/call') {
    const name = message.params?.name;
    const args = message.params?.arguments || {};

    if (!tools.some(tool => tool.name === name)) {
      protocolError(message.id, -32602, 'Unknown tool');
      return;
    }

    if (name === 'find_lecture') {
      const number = args.number;

      if (!Number.isInteger(number)) {
        protocolError(message.id, -32602, 'Invalid lecture number');
        return;
      }

      const lectures = readLectures();
      const lecture = lectures.find(item => item.number === number);

      if (lecture) {
        respond(message.id, {
          content: [{
            type: 'text',
            text: `Title: ${lecture.title}\nTopics: ${lecture.topics}`
          }]
        });
      } else {
        respond(message.id, {
          content: [{
            type: 'text',
            text: `Lecture ${number} not found.`
          }],
          isError: true
        });
      }
      return;
    }

    if (name === 'search_lectures') {
      if (typeof args.keyword !== 'string' || !args.keyword.trim()) {
        protocolError(message.id, -32602, 'Invalid keyword');
        return;
      }

      const lectures = readLectures();
      const keyword = args.keyword.toLowerCase();

      const matches = lectures.filter(lecture =>
        lecture.title.toLowerCase().includes(keyword) ||
        lecture.topics.toLowerCase().includes(keyword)
      );

      const text = matches.length
        ? matches.map(lecture =>
            `${lecture.number}: ${lecture.title} - ${lecture.topics}`
          ).join('\n')
        : 'No matching lectures found.';

      respond(message.id, {
        content: [{ type: 'text', text }]
      });
      return;
    }
  }

  if (message.id !== undefined) {
    protocolError(message.id, -32601, 'Method not found');
  }
});
