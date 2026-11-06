# NeoNotes — Codex project instructions

## Product
NeoNotes is a private, single-user writing and note-taking application. The owner signs in with one allowlisted Google account. Notes are stored as visible files and folders in that owner's Google Drive. The editor is rich text (TipTap), not Markdown-first.

## Current implementation status
- Initial UI and TipTap editor are implemented.
- The current starter stores drafts in browser localStorage only.
- Google authentication, database-backed token storage, and Google Drive synchronization are NOT implemented yet.
- Do not describe local browser storage as cloud backup or Google Drive sync.

## Architecture direction
- Next.js App Router + TypeScript.
- Tailwind CSS and reusable React components.
- TipTap editor; keep TipTap JSON as the internal editing representation where practical, and serialize HTML for Drive files.
- Auth.js with Google OAuth for identity and sessions.
- Google Drive API v3 for document and folder CRUD.
- Use the narrow `drive.file` scope initially.
- Use a small Postgres database (for example Neon) for Auth.js persistence and securely encrypted OAuth refresh tokens. Do not store note bodies in Postgres.
- All Google Drive API calls must run server-side.

## Security requirements
- Enforce `ALLOWED_GOOGLE_EMAIL` on the server, not only in the UI.
- Verify the Google account email is verified.
- Never expose client secrets, access tokens, or refresh tokens to browser code.
- Encrypt refresh tokens at rest.
- Never commit `.env` files or credentials.
- Validate ownership and authorization on every protected API request.
- Use secure session cookies and CSRF protections provided by the auth framework.
- Do not request broad Google Drive access unless the owner explicitly changes the product requirement.

## Data safety requirements
- Never overwrite a Drive file based only on a stale client copy.
- Track Drive file IDs and `modifiedTime` / version metadata.
- Use conditional conflict detection before updates; if a remote file changed, preserve both versions or ask the user to resolve the conflict.
- Keep unsaved local edits in IndexedDB once offline support is implemented.
- Show explicit save states. Do not show "Saved" until the server confirms the Drive write.
- Retry transient failures with bounded backoff; do not retry permission errors forever.

## Development workflow
- Make small, reviewable changes.
- Before changing architecture, explain the trade-off.
- Run TypeScript checks, lint, and relevant tests after changes.
- Do not silently remove existing features.
- Add tests for authentication restrictions, Drive CRUD, autosave, and conflict handling.
- Keep README and `.env.example` current.
