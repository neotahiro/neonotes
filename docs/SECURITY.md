# Security notes

## What protects the notes
- **Sign-in:** Google only. The server accepts one email address (`ALLOWED_EMAIL`), and only if Google says it is verified. If the setting is missing, nobody can sign in.
- **Google's own gate:** the Google Cloud app stays in "Testing" with only the owner as a test user. Do not click "Publish app".
- **Private by default:** a middleware blocks every page and API route for signed-out visitors. The server re-checks the email on every Drive call.
- **Narrow Drive access:** the `drive.file` permission only exposes files this app created, never the rest of the Drive.
- **Secrets stay on the server:** the Google client secret and the long-lived Drive key never reach the browser. The Drive key lives inside the encrypted session cookie (`httpOnly`, `Secure`).
- **Write checks:** changes must come from our own site (Origin check), inputs are validated, sizes are capped, and ids are restricted to safe characters.
- **Deleting:** removed notes go to the Drive trash, so they can be recovered.
- **Note content:** saved HTML is parsed by the editor, which discards anything it doesn't know (scripts, unsafe link types). Links open in a new tab with `noopener`.
- **Browser rules:** a Content-Security-Policy and other headers are set in `next.config.mjs`.

## If something goes wrong
- **Lost laptop or phone:** go to Google Account → Security → Third-party access, remove NeoNotes, and sign out other sessions.
- **Secret leaked:** in Google Cloud (Google Auth Platform → Clients) create a new client secret, update `AUTH_GOOGLE_SECRET` in Vercel, delete the old secret, then redeploy. To sign everyone out, change `AUTH_SECRET` in Vercel and redeploy.
- **Never** put secrets in the GitHub repo, in chat, or in a variable that starts with `NEXT_PUBLIC_`.
