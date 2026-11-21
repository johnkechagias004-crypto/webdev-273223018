# Instructions for the agent

Read this file at the start of every session. Keep it short and correct; update it when the project changes.

## Project

StudyCircle is a web application for university students to create, discover and join study groups.

See `SPEC.md` for goals, non-goals and acceptance criteria.

## Commands

- Install: No external dependencies required for Exercise 1.
- Run: `npm run --silent mcp`
- Test: `npm test`
- Exercise 2 check: `node checks/ex2.mjs`
- Coverage: Not configured yet.
- MCP server: `node mcp-server/server.js`

## Conventions

- Use JavaScript with clear and descriptive names.
- Use camelCase for variables and functions.
- Use PascalCase for React components.
- Keep HTTP routes in src/routes/.
- Keep business rules and validation in src/services/.
- Keep database operations in src/repositories/.
- Keep frontend components in src/frontend/.
- Return consistent JSON responses and appropriate HTTP status codes.
- HTTP routes and MCP tools must share the same service functions.
- Never hardcode passwords, API keys or secrets.

## Layers

The following application layers are planned for Exercise 3:

- Frontend: src/frontend/
- HTTP routes: src/routes/
- Service layer: src/services/
- Data access: src/repositories/
- Database: src/db/
- MCP server: mcp-server/

Requests arrive two ways and both end in the same place:

- HTTP route handler → service → data access → database
- MCP tool → **the same service** → data access → database

A route handler reads the request and turns a result into a status code. A service holds the rules and knows nothing about HTTP or MCP. Only the data layer writes SQL.

An MCP tool must never access the database directly.

## The model feature

- Planned provider: Google Gemini 2.5 Flash.
- The provider is configured in exactly one file, to be implemented in Exercise 3.
- The key comes from an environment variable and is never committed or logged.
- Every call has a timeout and a deterministic fallback, so the app still works when the provider is down or rate-limited.
- The model's output is re-checked against real data before anything is saved or shown.
- Tests never call the provider: they pass in a fake client.

## The MCP server

- Lives in `mcp-server/`, grew out of Exercise 1.
- Currently provides find_lecture and search_lectures.
- During Exercise 3, application tools will call shared service functions.
- No application tool may access the database directly.
- Planned authentication uses MCP_TOKEN.
- Application tools must enforce exactly the same authorization rules as the HTTP API.
- Adding a tool means adding a row to the table in `SPEC.md` too.

## Tests and coverage

- Every acceptance criterion in `SPEC.md` has an id like `AC-3`, and must have a test whose title contains that id.
- The required coverage gate in CI is 100% of the service layer and 80% overall.
- Application tests and coverage are not implemented yet.
- A test is evidence. Changing a test so the code passes destroys the evidence.

## Always ask before

- deleting files or folders
- editing a migration that has already run
- installing or removing dependencies
- pushing, tagging or changing CI
- anything that touches secrets or `.env`
- changing an authentication or authorization rule
- adding, renaming or removing an MCP tool
- changing a coverage threshold
- sending user data to a third-party model

## Never

- commit secrets, passwords, API keys or an OAuth client secret
- weaken or delete a test to make it pass
- lower a coverage threshold or switch off a CI job to make the build green
- add an MCP tool that reaches past the service layer
- log a prompt that contains somebody's personal data 