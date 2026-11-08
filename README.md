# NeoNotes

A minimalist, distraction-free writing app. Next.js, TypeScript, Tailwind CSS, TipTap and Lucide.

Notes and folders are saved to the owner's Google Drive (Noenotes folder) and cached in this browser (IndexedDB). If two devices change the same note, both versions are kept. See [docs/PLAN.md](docs/PLAN.md).

## Run it

```bash
npm install
npm run dev
```

Open http://localhost:3000.

## Tests

```bash
npm test
```

Covers the Drive requests, request validation, and the sync logic (including conflicts) against an in-memory fake of Drive.
