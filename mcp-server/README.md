# Exercise 1 · MCP server

Your hand-written MCP server lives in this folder. The server is implemented in JavaScript using Node.js.

## What is already here

| File | What it is |
|---|---|
| `lectures.json` | The course lectures used by the tools. |
| `messages.jsonl` | The messages sent by the MCP client. |
| `check.mjs` | The self-check script used to test the server. |
| `server.js` | The MCP server implementation. |

## The two tools

### 1. find_lecture

This tool finds a lecture by its number and returns its title and topics from `lectures.json`.

Input: `number` (integer from 1 to 10).

If the lecture does not exist, the server returns a readable message with `isError: true` instead of a protocol error.

### 2. search_lectures

This tool searches local course lectures using a keyword.

Input: `keyword` (string).

It searches lecture titles and topics and returns matching lectures.

Both tools have descriptions and input schemas to help an AI model select the appropriate tool.

## Where this goes next

From Exercise 3, this MCP server can be extended to work with the project's real data.

The MCP tools should call the same service functions as the HTTP routes, ensuring consistent rules, validation, and authorization.

The design principle is: **one set of rules, two front doors.**

## How to start it

Run the MCP server:

```bash
npm run --silent mcp
```

Alternatively:

```bash
node mcp-server/server.js
```

To run the self-check:

```bash
node mcp-server/check.mjs -- npm run --silent mcp
```

Self-check result: **12/12 checks passed.**

## Session transcript

### 1. Initialize

Request:

```json
{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-11-25","capabilities":{},"clientInfo":{"name":"test-client","version":"1.0.0"}}}
```

Response:

```json
{"jsonrpc":"2.0","id":1,"result":{"protocolVersion":"2025-11-25","capabilities":{"tools":{}},"serverInfo":{"name":"my-mcp-server","version":"1.0.0"}}}
```

The server successfully initialized and returned its protocol version, capabilities, and server information.

### 2. Tools list

Request:

```json
{"jsonrpc":"2.0","id":2,"method":"tools/list","params":{}}
```

Response:

```json
{
  "jsonrpc": "2.0",
  "id": 2,
  "result": {
    "tools": [
      {
        "name": "find_lecture",
        "description": "Find a lecture by its number and return its title and topics.",
        "inputSchema": {
          "type": "object",
          "properties": {
            "number": {
              "type": "integer",
              "minimum": 1,
              "maximum": 10
            }
          },
          "required": ["number"]
        }
      },
      {
        "name": "search_lectures",
        "description": "Search local course lectures by a keyword in their titles or topics.",
        "inputSchema": {
          "type": "object",
          "properties": {
            "keyword": {
              "type": "string",
              "description": "The keyword to search for."
            }
          },
          "required": ["keyword"]
        }
      }
    ]
  }
}
```

The server successfully returned both tools, including their descriptions and input schemas.

### 3. Successful tool call

Request:

```json
{"jsonrpc":"2.0","id":3,"method":"tools/call","params":{"name":"find_lecture","arguments":{"number":5}}}
```

Response:

```json
{"jsonrpc":"2.0","id":3,"result":{"content":[{"type":"text","text":"Title: What the agent built, part 1\nTopics: HTTP, REST vs GraphQL, data modeling, ORM, layers"}]}}
```

The server successfully returned the title and topics of lecture 5.

### 4. Failed tool call

Request:

```json
{"jsonrpc":"2.0","id":4,"method":"tools/call","params":{"name":"find_lecture","arguments":{"number":99}}}
```

Response:

```json
{"jsonrpc":"2.0","id":4,"result":{"content":[{"type":"text","text":"Lecture 99 not found."}],"isError":true}}
```

The server correctly handled a nonexistent lecture.

Instead of crashing or returning a protocol error, it returned a tool result with `isError: true`.

## The description experiment

Original description:

"Find a lecture by its number and return its title and topics."

Proposed modified description:

"Use this tool when the user asks for a specific lecture number to retrieve its title and topics."

The modified description explains more clearly when the model should select the tool.

The effect on tool selection has not yet been tested with a model.

The expected improvement is that the model will distinguish requests for a specific lecture number from keyword searches.
