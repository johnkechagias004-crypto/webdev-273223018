# StudyCircle Readiness Report (Exercise 4)

## Live URL
- **Production URL:** `https://webdev-273223018.onrender.com` (configured in `course.json`)
- **How I checked:** Verified health endpoint and page serving logic via automated check `node checks/ex4.mjs`.

## Environment variables
| Variable | Purpose | Example / Notes |
|---|---|---|
| `PORT` | Web server port | `3000` |
| `DATABASE_URL` | Placeholder for db configuration | sqlite file path (`studycircle.sqlite`) |
| `SESSION_SECRET` | Secret for session handling | random secure string |
| `PUBLIC_BASE_URL` | Public base URL of the app | `https://your-app.onrender.com` |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID | from Google Cloud Console |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret | from Google Cloud Console |
| `GEMINI_API_KEY` | Google Gemini API key | from Google AI Studio |
| `MODEL_NAME` | Model identifier | `gemini-2.5-flash` |
| `MCP_TOKEN` | Token for MCP server authentication | bearer/token for MCP tools |

- **How I checked:** Inspected `.env.example` and runtime configuration in `src/app.js` and `src/db/database.js`.

## fail
- **What happens when things fail:**
  - Database error: Returns HTTP 500 with user-friendly error message, without revealing stack traces.
  - Model failure (timeout, rate limit, API error): Falls back gracefully to default study group description and plan, allowing the user to proceed and save manually.
  - Network failure during Google OAuth or API calls: Displays clear error banners (`.alert-error`) in the UI.
- **How I checked:** Unit and integration tests in `src/services/aiService.test.js`, `src/services/authService.test.js`, and `src/routes/api.test.js`.

## states
- **The four states of one screen (Study Groups List / Details / Create):**
  1. **Loading:** Spinners / loading indicators display instantly upon form submission or data fetch.
  2. **Empty:** Descriptive empty-state messages ("No study groups found") guide the user on what to do next.
  3. **Error:** Human-readable error alerts (`.alert-error`) instead of raw stack traces or JSON.
  4. **Success:** Dynamic state updates and success banners (`.alert-success`) confirming actions (create, join, leave) without requiring a full page reload.
- **How I checked:** Code inspection of `src/frontend/App.jsx` and UI checklist in `docs/UI.md`.

## waterfall
- **Request waterfall (Joining a study group):**
  1. Frontend (`GroupDetails.jsx`) sends `POST /api/groups/:id/join` with session credentials / `x-user-id`.
  2. Express route handler (`groupRoutes.js`) receives the request.
  3. Service layer (`groupService.js`) validates user authentication, group existence, available capacity (`count < capacity`), and duplicate membership constraints.
  4. Repository layer (`groupRepository.js`) runs database transaction (`BEGIN IMMEDIATE`, INSERT into memberships, COMMIT).
  5. Service returns result, HTTP route responds with JSON status 200/201.
  6. Frontend updates local state and renders success confirmation.
- **How I checked:** Traced code paths across `src/routes/groupRoutes.js`, `src/services/groupService.js`, and `src/repositories/groupRepository.js`.

## Security
- **Security basics checked:**
  - Passwords securely hashed using `bcrypt` (never stored in plaintext).
  - CSRF/Session management via authenticated tokens and session maps.
  - Input validation and parameterization across all SQL queries (preventing SQL injection via `node:sqlite` prepared statements).
  - CORS and auth header enforcement on API routes and MCP tools.
- **How I checked:** Automated security tests in `authService.test.js`, `groupRepository.test.js`, and `api.test.js`.

## gaps
- **Known gaps, ranked by risk:**
  1. **Ephemeral SQLite Storage on Render Free:** Render Free instances have ephemeral filesystems. SQLite data (`studycircle.sqlite`) will reset on service restarts or redeployments unless a persistent disk (paid plan) is attached. (Mitigated by automatic database table creation/migrations on startup).
  2. **In-Memory Session Map:** Sessions are stored in an in-memory `Map` rather than a distributed store (e.g., Redis). Service restarts invalidate active sessions.
- **How I checked:** Architecture review against Render deployment documentation and platform constraints.

## Model
- **The model feature in production:**
  - **Data leaving the app:** The application sends the study subject, learning goals, and optional notes entered by the user to an outside third-party provider (Google Gemini API via `gemini-2.5-flash`). No private passwords, email addresses, or personal credentials ever leave the app or go to the model.
  - **Pricing reference:** Based on Google Gemini API pricing (as of Feb 2026: Input $0.30 per million tokens, Output $2.50 per million tokens). Estimated cost per model call (~500 input/output tokens combined): approximately **$0.0002** per request.
  - **Down / fallback behavior:** If the Gemini API is down, times out (>10s), rate-limited (429), or unavailable, the application catches the error, logs it securely without prompt data, and returns a deterministic fallback description and plan so the user can edit and create the group manually.
- **How I checked:** Inspected `src/services/aiService.js` and test suite `src/services/aiService.test.js`.

## MCP
- **The MCP server in production:**
  - **Who may call MCP tools:** Authenticated users presenting a valid `MCP_TOKEN`.
  - **Permissions:** MCP tools (`list_study_groups`, `get_study_group`, `create_study_group`, `join_study_group`, `leave_study_group`) share the exact same service functions (`groupService.js`) and authorization rules as the HTTP API. An MCP tool never accesses the database directly.
- **How I checked:** Inspected `mcp-server/server.js`, `src/services/groupService.js`, and ran `npm test`.
