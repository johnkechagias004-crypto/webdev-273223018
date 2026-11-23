import readline from 'node:readline';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as groupService from '../src/services/groupService.js';
import * as authService from '../src/services/authService.js';
import { getDatabase } from '../src/db/database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
  },
  {
    name: 'list_study_groups',
    description: 'Lists available study groups and optionally filters them by subject or course.',
    inputSchema: {
      type: 'object',
      properties: {
        subject: { type: 'string' },
        search: { type: 'string' }
      }
    }
  },
  {
    name: 'get_study_group',
    description: 'Retrieves detailed information about a selected study group, including its capacity.',
    inputSchema: {
      type: 'object',
      properties: {
        groupId: { type: 'integer' }
      },
      required: ['groupId']
    }
  },
  {
    name: 'create_study_group',
    description: 'Creates a study group after validating its title, subject and maximum capacity.',
    inputSchema: {
      type: 'object',
      properties: {
        title: { type: 'string' },
        subject: { type: 'string' },
        description: { type: 'string' },
        capacity: { type: 'integer' }
      },
      required: ['title', 'subject', 'capacity']
    }
  },
  {
    name: 'join_study_group',
    description: 'Adds the authenticated student to a study group if a place is available.',
    inputSchema: {
      type: 'object',
      properties: {
        groupId: { type: 'integer' }
      },
      required: ['groupId']
    }
  },
  {
    name: 'leave_study_group',
    description: 'Removes the authenticated student\'s membership from a selected group.',
    inputSchema: {
      type: 'object',
      properties: {
        groupId: { type: 'integer' }
      },
      required: ['groupId']
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
    const token = message.params?.token || process.env.MCP_TOKEN || 'default-token';

    if (!tools.some(tool => tool.name === name)) {
      protocolError(message.id, -32602, 'Unknown tool');
      return;
    }

    try {
      const db = getDatabase();
      // Authenticated user via token / session validation
      let user = { id: 1, email: 'mcp_user@example.com' };

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
            content: [{ type: 'text', text: `Title: ${lecture.title}\nTopics: ${lecture.topics}` }]
          });
        } else {
          respond(message.id, {
            content: [{ type: 'text', text: `Lecture ${number} not found.` }],
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
          ? matches.map(lecture => `${lecture.number}: ${lecture.title} - ${lecture.topics}`).join('\n')
          : 'No matching lectures found.';
        respond(message.id, {
          content: [{ type: 'text', text }]
        });
        return;
      }

      if (name === 'list_study_groups') {
        const groups = groupService.listGroups(args, user, db);
        respond(message.id, {
          content: [{ type: 'text', text: JSON.stringify(groups, null, 2) }]
        });
        return;
      }

      if (name === 'get_study_group') {
        const group = groupService.getGroupDetails(args.groupId, user, db);
        respond(message.id, {
          content: [{ type: 'text', text: JSON.stringify(group, null, 2) }]
        });
        return;
      }

      if (name === 'create_study_group') {
        const group = groupService.createGroup(args, user, db);
        respond(message.id, {
          content: [{ type: 'text', text: JSON.stringify(group, null, 2) }]
        });
        return;
      }

      if (name === 'join_study_group') {
        const result = groupService.joinGroup(args.groupId, user, db);
        respond(message.id, {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
        });
        return;
      }

      if (name === 'leave_study_group') {
        const result = groupService.leaveGroup(args.groupId, user, db);
        respond(message.id, {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
        });
        return;
      }

    } catch (err) {
      respond(message.id, {
        content: [{ type: 'text', text: err.message }],
        isError: true
      });
      return;
    }
  }

  if (message.id !== undefined) {
    protocolError(message.id, -32601, 'Method not found');
  }
});
