# NeoNotes

A calm, personal writing space. This repository contains the initial UI and rich-text editor starter.

## Current status

This is an early frontend starter:
- Responsive workspace layout
- Sidebar with sample notes
- TipTap rich-text editor
- Document title editing
- Word count
- Local browser draft persistence

**Google sign-in and Google Drive sync are not implemented yet.** At this stage, notes are saved in the current browser's `localStorage`; this is not cloud storage or a backup.

## Requirements

- Node.js 20.9 or later
- npm

## Run locally

```bash
npm install
npm run dev
```

Open http://localhost:3000.

## Next milestones

1. Improve editor and document management UX.
2. Add Auth.js Google sign-in and a server-side email allowlist.
3. Add Postgres persistence for auth sessions and encrypted OAuth tokens.
4. Add Google Drive folder and file operations using the `drive.file` scope.
5. Add robust autosave, IndexedDB recovery, and external-edit conflict detection.
6. Add tests and deploy.

## Environment variables

Copy `.env.example` to `.env.local` when backend integrations are introduced. Never commit real credentials.

## Codex

Read `AGENTS.md` before making changes. It contains product constraints, security requirements, and data-safety rules.
