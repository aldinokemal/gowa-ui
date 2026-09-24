# Working on gowa-ui

This repository is a React/TypeScript/Vite dashboard that must ship as one
self-contained `dist/index.html` file. Read the source and the relevant API code
for the requested behavior; a small UI change does not require reading every
design or SDD note.

## Contracts

- Keep `HashRouter`, bundled assets, and zero runtime network requests for code,
  fonts, and images. Do not add dynamic imports or code splitting.
- Preserve GOWA transport contracts: Basic Auth, `X-Device-Id`, device query
  parameters, `/app/info`, and WebSocket query authentication. Confirm the
  corresponding backend route before changing a client request.
- Keep secrets and server credentials in the existing local-storage flow; do not
  log authorization headers or WebSocket credentials.
- Match the existing React, Tailwind, and component conventions. Keep generated
  `dist/` output out of source edits unless the release process explicitly needs it.

## Checks

Run from the repository root and choose checks for the changed behavior:

```sh
npm run typecheck
npm run lint
npm run test
npm run build
```

The build must produce the single-file artifact described in `README.md`. Report
the checks actually run; Markdown-only edits need only a diff/link check.
