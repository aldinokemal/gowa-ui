# gowa-ui

Standalone web dashboard for [go-whatsapp-web-multidevice](https://github.com/aldinokemal/go-whatsapp-web-multidevice) (gowa).

Built as a single self-contained HTML file — React 19, TypeScript, Vite, Tailwind CSS 4, shadcn/ui — following the architecture of [CLIProxyAPI](https://github.com/router-for-me/CLIProxyAPI) and its [Management Center](https://github.com/router-for-me/Cli-Proxy-API-Management-Center): the backend stays a pure API, the UI ships separately and connects to any gowa server.

> **Status**: M0 scaffold. Feature milestones are tracked in the roadmap below.

## Ways to run it

1. **Served by gowa** — gowa downloads the latest `gowa-ui.html` release asset and serves it at `/` (planned backend integration; lands with the parity cutover).
2. **Self-hosted / GitHub Pages** — host the built file anywhere static and connect it to your server (URL + basic-auth credentials, stored in `localStorage`).
3. **Local file** — download `gowa-ui.html` from a release and open it in a browser (some browser APIs need an HTTP origin; hosting is recommended for daily use).

## Backend requirements

A gowa server with the cross-origin enablers (CORS `Authorization`/`X-Device-Id` headers, `GET /app/info`, WebSocket query auth):

- REST auth: `Authorization: Basic <base64(user:pass)>` header.
- Device targeting: `X-Device-Id` header (URL-encoded) or `?device_id=` query.
- WebSocket: `/ws?device_id=<id>&authorization=<base64(user:pass)>` — browsers cannot set headers on WebSocket connections, so the credential rides the query string. Use TLS.
- Server metadata: `GET /app/info` (version, media size limits).

## Release contract

Every `v*` tag publishes exactly one release asset named **`gowa-ui.html`** (plus a `.sha256` checksum). The gowa backend consumes `releases/latest` by that exact asset name, verifies the digest, caches it, and serves it at `/`.

## Development

```bash
cp .env.example .env   # set VITE_DEFAULT_SERVER_URL if your gowa isn't on :3000
npm install
npm run dev
```

Connect directly to `http://localhost:3000` (requires a gowa build with the CORS enablers), or use the same-origin dev proxy: point the connect screen at `http://localhost:5173/gowa`, which forwards to `VITE_DEFAULT_SERVER_URL` (WebSocket included).

Other scripts: `npm run build` (single-file production build into `dist/index.html`), `typecheck`, `lint`, `format`, `preview`.

### Logo assets

The brand asset is [`src/views/assets/gowa.svg`](https://github.com/aldinokemal/go-whatsapp-web-multidevice/blob/main/src/views/assets/gowa.svg) in the backend repo — an SVG wrapper around embedded 1024px rasters (~864 KB), too heavy to inline. The bundled copies are rasterized from it; to regenerate after a branding change:

```bash
rsvg-convert -w 128 -h 128 gowa.svg -o /tmp/gowa-logo.png
cwebp -q 90 /tmp/gowa-logo.png -o src/assets/gowa-logo.webp   # sidebar logo
rsvg-convert -w 64 -h 64 gowa.svg -o /tmp/gowa-favicon.png     # then re-embed as the
                                                               # base64 favicon in index.html
```

### Single-file constraints

The build must stay one file with zero external requests:

- no `import()` / `React.lazy` (code splitting breaks single-file output)
- no CDN scripts, external fonts, or remote images — everything is bundled and inlined
- `HashRouter` only (survives `file://` and any mount path)

CI asserts `dist/` contains exactly one file.

## Roadmap

- [x] **M0** — scaffold: single-file build, app shell, dark mode, CI/release workflows
- [x] **M1** — connect screen, device manager, QR/pair-code login, logout/reconnect, WebSocket events
- [ ] **M2** — send suite (message, image, file, video, sticker, contact, location, audio, poll, link, presence)
- [ ] **M3** — message actions (delete, revoke, react, update, read, forward) + call reject
- [ ] **M4** — groups (create, join, info, participants, settings, invite links)
- [ ] **M5** — account (avatar, push name, privacy, contacts) + newsletters
- [ ] **M6** — chats (list, message viewer, pin, disappearing timers)
- [ ] **M7** — parity audit vs the embedded dashboard → v1.0.0

Post-v1 backlog: device webhook editor, Chatwoot module, message star/unstar, chat archive, WebAuthn passkey flow.
