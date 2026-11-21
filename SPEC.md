# StudyCircle — Study Groups

## Project option

Study groups.

## Goals

- Allow students to create and join study groups for university courses.
- Help students discover available study groups by subject.
- Provide secure account registration and authentication.
- Allow group owners to manage their own groups.
- Use an AI model to suggest descriptions and study plans.
- Expose project functionality through an HTTP API and an MCP server.

## Non-goals

- The application will not provide video calls or live streaming.
- The application will not process payments or subscriptions.
- The application will not replace the university's official learning platform.
- The application will not include real-time messaging.
- The application will not automatically publish AI-generated content.
- The application will not support administrator access to private passwords.

## Constraints

- The backend will use Node.js and Express.
- The frontend will use React.
- SQLite will be used for local data storage.
- Users must authenticate before creating or joining groups.
- Passwords must be securely hashed and never stored as plain text.
- Google OAuth will provide an additional sign-in option.
- The application must validate all user input.
- Only group owners may edit their own groups.
- Group membership must never exceed the available capacity.
- The HTTP API and MCP tools must call the same service functions.
- API keys and secrets must be stored in environment variables.
- Automated tests must verify the acceptance criteria.

## The model feature

- Model: Google Gemini 2.5 Flash, text-based language model.
- Input: The user provides a study subject, learning goals and optional notes.
- Output: The model generates a suggested study group description and a short study plan.
- When it fails: If the model is slow, unavailable, rate-limited or produces an invalid result, the application displays a clear message and allows the user to enter a description manually. The AI result is always reviewed before publication.

## Auth

- Local: Users register and sign in using an email address and password. Passwords are securely hashed using bcrypt. Invalid credentials must not create a session.
- Provider: Google OAuth 2.0 allows users to sign in with their Google accounts.
- Linking: If the same user wants to sign in using both methods, the application requires verification and explicit account linking. A matching email address alone must not automatically merge accounts. Both methods then reference the same user record.

## MCP tools

| Tool | What it does | Who may call it |
| --- | --- | --- |
| list_study_groups | Lists available study groups and optionally filters them by subject or course. | Authenticated users |
| get_study_group | Retrieves detailed information about a selected study group, including its capacity. | Authenticated users |
| create_study_group | Creates a study group after validating its title, subject and maximum capacity. | Authenticated users |
| join_study_group | Adds the authenticated student to a study group if a place is available. | Authenticated users |
| leave_study_group | Removes the authenticated student's membership from a selected group. | Group members |

All MCP tools must call the same service functions as the HTTP API.

MCP authentication uses MCP_TOKEN, and operations must respect the permissions of the authenticated user.

## UI

Frontend stack: React, HTML, CSS and JavaScript.

The application will include the following screens:

1. Login and registration screen: Users can create an account, sign in with email and password or use Google sign-in.
2. Study groups list screen: Users can browse and filter available study groups.
3. Study group details screen: Users can view group information and join or leave a group.
4. Create study group screen: Authenticated users can create a group and optionally generate a description with AI.
5. My groups screen: Users can see groups they own or have joined.
6. Profile screen: Users can view account information and linked authentication methods.

The interface will include form validation, loading indicators, empty states and clear error messages.

The detailed UI checklist will be maintained in docs/UI.md.

## Architecture

Planned architecture for Exercise 3:

Frontend → HTTP Routes → Service Layer → Data Access Layer → SQLite Database.

Example request: A student joins a study group.

1. `src/frontend/pages/GroupDetails.jsx` sends the request.
2. `src/routes/groupRoutes.js` receives the HTTP request.
3. `src/services/groupService.js` validates permissions and available capacity.
4. `src/repositories/groupRepository.js` performs database operations.
5. `src/db/database.js` manages the SQLite database connection.
6. The service returns the result to the HTTP route.
7. The frontend displays confirmation or an error.

The MCP server will call `groupService.js` for the same operation rather than implementing separate database rules.

Current mismatch: The Exercise 1 MCP server reads `lectures.json` directly instead of using the planned application service layer. This will be refactored during Exercise 3.

The application architecture described above is planned and has not yet been implemented.

## Acceptance criteria

- [AC-1] A student who registers with a valid email and password sees a successful registration message, and exactly one new user record with a hashed password appears in the `users` table.
- [AC-2] A student who enters incorrect login credentials sees an authentication error, no session is created, and no user data is modified.
- [AC-3] A student who successfully signs in using Google is authenticated, and a corresponding verified provider identity is associated with a user record.
- [AC-4] A student who links a Google account to an existing local account after verification can use both login methods, and the database still contains only one user account for that student.
- [AC-5] An authenticated student who opens the study groups screen sees the available groups from the database, and no database records are modified.
- [AC-6] An authenticated student who creates a group using valid information sees it in the list, and exactly one group record is inserted into the `groups` table.
- [AC-7] A student who joins a group with available capacity sees a success message, and exactly one new membership record appears in the `memberships` table.
- [AC-8] A student who tries to join a full group sees "This group is full", and no new membership record is created.
- [AC-9] A student who tries to join the same group twice receives an informative message, and the database retains only one membership record for that student and group.
- [AC-10] A student who leaves a group sees confirmation, and their membership record is removed from the `memberships` table.
- [AC-11] A group owner who requests an AI-generated description receives an editable suggestion, and the group description in the database is not changed until the owner explicitly saves it.
- [AC-12] A group owner who requests AI assistance while the model provider is unavailable sees a failure message and can enter a description manually, without creating an incomplete group record.

## Slice 1: sign-in and study groups list screen

The first implementation slice will focus on authentication and displaying study groups.

Scope:

- Implement local account registration.
- Implement local login and logout.
- Implement Google sign-in and verified account linking.
- Create the initial database tables.
- Display available study groups.
- Add basic automated tests for AC-1 through AC-5.

Later slices will implement group creation, membership management, AI assistance and MCP integration with the application services.

## Traceability

The following tests are planned for Exercise 3 and later. They have not yet been implemented.

| Criterion | Test |
| --- | --- |
| AC-1 | AC-1 valid registration stores a hashed password |
| AC-2 | AC-2 invalid login does not create a session |
| AC-3 | AC-3 Google sign-in creates or retrieves a user |
| AC-4 | AC-4 account linking keeps one user record |
| AC-5 | AC-5 group list displays stored groups |
| AC-6 | AC-6 group creation inserts one record |
| AC-7 | AC-7 joining an available group succeeds |
| AC-8 | AC-8 joining a full group is rejected |
| AC-9 | AC-9 duplicate memberships are prevented |
| AC-10 | AC-10 leaving a group removes membership |
| AC-11 | AC-11 AI suggestion requires user confirmation |
| AC-12 | AC-12 AI failure allows manual input |

## Spec vs result

The project application has not yet been implemented, so AC-1 through AC-12 are pending verification.

The Exercise 1 MCP server has already passed its 12/12 self-checks. However, it currently provides lecture tools rather than the study group tools required for the final project.

The main difference between the existing implementation and this specification is that the MCP server reads lecture data directly instead of using shared application services.

During Exercise 3, the architecture will be updated so that the HTTP API and MCP server share the same validation, authorization and database service functions.

No application acceptance criteria are claimed as passed at this stage. The specification will be updated after the first implementation slice is tested.