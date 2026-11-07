# Noenotes — project plan

A private, distraction-free writing app. Notes live as individual files in the owner's Google Drive.

## 1. Requirements analysis

| Area | Decision |
|---|---|
| Users | One person (the owner). Single-tenant by design. |
| Data | Drive is the source of truth. No database. |
| Editing | TipTap (ProseMirror). Content stored as HTML. |
| Offline | Local-first: edits hit IndexedDB first, then sync to Drive. |
| Hosting | **GitHub hosts the code, not the app.** GitHub Pages is static-only and cannot keep an OAuth client secret. Deploy the repo to Vercel (free Hobby tier), Netlify or Cloudflare. CI runs in GitHub Actions. |

## 2. Architecture

```
Browser (React UI, TipTap, IndexedDB draft buffer)
   │  same-origin fetch, httpOnly session cookie
   ▼
Next.js server (route handlers + middleware)
   ├─ Auth.js: Google sign-in, allow-list, session
   └─ /api/drive/*: calls Google Drive with the user's token
   ▼
Google Drive (folder "Noenotes", one file per note)
```

The browser never sees the client secret, access token or refresh token. All Drive calls go through our route handlers.

## 3. Folder structure

```
src/
  app/
    layout.tsx, page.tsx, globals.css
    login/page.tsx                 (step 4)
    api/auth/[...nextauth]/route.ts(step 4)
    api/drive/                     (step 5)
      files/route.ts               list, create
      files/[id]/route.ts          read, update, rename, delete
  components/
    layout/    AppShell, Sidebar, TopBar, ProfileMenu
    navigation/ FileTree, TreeRow
    editor/    Editor, Toolbar
    ui/        IconButton, ThemeToggle
  hooks/       useTheme, useWorkspace, (later) useAutosave, useOnlineStatus
  lib/
    types.ts, utils.ts, mock-data.ts
    auth.ts                        Auth.js config + allow-list   (step 4)
    drive/                         server-only Drive client      (step 5)
    sync/                          IndexedDB queue, retry, conflicts (step 6)
middleware.ts                      blocks every route except /login (step 4)
```

## 4. Authentication approach (step 4)

- **Auth.js (NextAuth v5)** with the Google provider, authorization-code flow with PKCE.
- Secrets in server env vars only: `AUTH_SECRET`, `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`, `ALLOWED_EMAIL`.
- `signIn` callback rejects anyone whose `email_verified` is false or whose email is not `ALLOWED_EMAIL`. After the first sign-in, also pin the Google account `sub` ID in `ALLOWED_GOOGLE_SUB`, because emails can change and subs cannot.
- Session: encrypted JWT in an `httpOnly`, `Secure`, `SameSite=Lax` cookie, 7-day max age.
- `middleware.ts` redirects unauthenticated requests to `/login` and returns 401 for `/api/*`.
- Scopes: `openid email profile https://www.googleapis.com/auth/drive.file`. `drive.file` only grants access to files this app created, not the rest of the Drive.
- `access_type=offline` + `prompt=consent` to receive a refresh token. It stays in the encrypted server-side token and rotates the access token when it expires.

## 5. Drive integration approach (step 5)

- On first run, create a folder `Noenotes` and remember its ID in the encrypted session or a small `.noenotes.json` file inside that folder.
- Folder → Drive folder. Note → file with MIME type `text/html`, name = title.
- Favorite flag, and anything else small, in Drive `appProperties`.
- A flat `files.list` for the whole tree (`parents`, `mimeType`, `modifiedTime`, `appProperties`), assembled into the tree client-side.
- Update with `files.update` (media upload). Send the last known `modifiedTime` and refuse to overwrite if Drive has a newer version.
- Delete moves to trash (`trashed: true`), so mistakes are recoverable.

## 6. Autosave and offline (step 6)

1. Every change writes a draft to IndexedDB immediately.
2. Debounced save (~1.5 s idle) to `/api/drive/files/:id`.
3. States: `saved`, `saving`, `offline`, `error`, shown in the top bar.
4. Failures retry with exponential backoff and a retry when the browser comes back online.
5. A draft is removed only after Drive confirms the write.
6. `beforeunload` warns if unsynced drafts exist.
7. On conflict, keep both: the Drive version stays, the local one is saved as "Title (conflict copy)".

## 7. Security considerations

- Client secret and tokens never reach frontend code; only `NEXT_PUBLIC_*` vars are visible to the browser, and none hold secrets.
- Allow-list enforced on the server for sign-in **and** on every API call, not just in the UI.
- Drive access limited to `drive.file`.
- Stored note HTML is sanitized on load (DOMPurify) because Drive content is treated as untrusted input; links get `rel="noopener noreferrer nofollow"` and only `http`, `https` and `mailto` are accepted.
- Security headers via `next.config`: CSP, `X-Frame-Options: DENY`, `Referrer-Policy`, `X-Content-Type-Options`.
- Same-origin API only; reject cross-site requests (check `Origin` on mutating routes).
- Request validation (Zod) and size limits on route handlers.
- `.env*` is git-ignored; set secrets in the host's dashboard. Enable GitHub secret scanning and Dependabot.
- Keep the Google OAuth app in "Testing" status with only your account as a test user, which blocks everyone else at Google's level too.

## 8. Roadmap

1. **Plan + interface** — this step. Sidebar, tree, editor, toolbar, themes, mock in-memory data.
2. Polish the interface (link popover instead of a prompt, keyboard shortcuts, delete confirmation dialog).
3. Local persistence (IndexedDB) so the app works before Drive exists.
4. Google sign-in with allow-list and route protection.
5. Drive storage: folder, file CRUD, favorites via `appProperties`.
6. Autosave, offline queue, conflict handling.
7. Hardening: headers, sanitizing, tests, deployment.
