# gowa-ui

A web dashboard for [go-whatsapp-web-multidevice](https://github.com/aldinokemal/go-whatsapp-web-multidevice) (gowa).

The whole app builds into **one HTML file** with no external dependencies. Host it anywhere (or just open it in a browser) and point it at your gowa server. The backend stays a pure API; the UI ships separately — same idea as [CLIProxyAPI](https://github.com/router-for-me/CLIProxyAPI) and its [Management Center](https://github.com/router-for-me/Cli-Proxy-API-Management-Center).

Built with React 19, TypeScript, Vite, Tailwind CSS 4, and shadcn/ui.

> **Status**: feature parity with gowa's embedded dashboard. Tagging a `v*` release publishes `gowa-ui.html`.

## How to use it

Pick one:

1. **Served by gowa** — gowa downloads the latest `gowa-ui.html` release and serves it at `/`. (Planned; lands with the parity cutover.)
2. **Host it yourself** — put the built file on any static host (GitHub Pages works). On first load, enter your server URL and basic-auth credentials; they're saved in `localStorage`.
3. **Open the file directly** — download `gowa-ui.html` from a release and open it in a browser. Works, but some browser APIs need an HTTP origin, so hosting is better for daily use.

## What your gowa server needs

The dashboard talks to gowa from the browser, so the server needs a few cross-origin features:

- **CORS** — allow the `Authorization` and `X-Device-Id` headers.
- **REST auth** — `Authorization: Basic <base64(user:pass)>` header.
- **Device selection** — `X-Device-Id` header (URL-encoded) or `?device_id=` query.
- **WebSocket auth** — `/ws?device_id=<id>&authorization=<base64(user:pass)>`. Browsers can't set headers on WebSocket connections, so the credential goes in the query string — use TLS.
- **Server info** — `GET /app/info` (version, media size limits).

## Development

```bash
cp .env.example .env   # set VITE_DEFAULT_SERVER_URL if your gowa isn't on :3000
npm install
npm run dev
```

Then connect the app to your server, either way:

- **Directly** — enter `http://localhost:3000` on the connect screen (needs a gowa build with the CORS features above).
- **Via the dev proxy** — enter `http://localhost:5173/gowa` instead; Vite forwards everything (WebSocket included) to `VITE_DEFAULT_SERVER_URL`, so CORS doesn't matter.

Other scripts: `npm run build` (single-file production build into `dist/index.html`), `typecheck`, `lint`, `format`, `preview`.

Before opening a change, run the checks relevant to it. UI and API changes should
pass `npm run typecheck`, `npm run lint`, `npm run test`, and `npm run build`; the
build confirms the single-file release contract.

### Single-file rules

The build must stay one file with zero external requests:

- No `import()` or `React.lazy` — code splitting breaks single-file output.
- No CDN scripts, external fonts, or remote images — everything is bundled and inlined.
- `HashRouter` only — it survives `file://` and any mount path.

CI checks that `dist/` contains exactly one file.

### Regenerating the logo

The source logo lives in the backend repo: [`src/views/assets/gowa.svg`](https://github.com/aldinokemal/go-whatsapp-web-multidevice/blob/main/src/views/assets/gowa.svg). It's ~864 KB (an SVG wrapping embedded 1024px rasters), so we don't inline it — we bundle rasterized copies instead. To regenerate them after a branding change:

```bash
rsvg-convert -w 128 -h 128 gowa.svg -o /tmp/gowa-logo.png
cwebp -q 90 /tmp/gowa-logo.png -o src/assets/gowa-logo.webp   # sidebar logo
rsvg-convert -w 64 -h 64 gowa.svg -o /tmp/gowa-favicon.png     # then re-embed as the
                                                               # base64 favicon in index.html
```

## Releases

Every `v*` tag publishes exactly one asset named **`gowa-ui.html`** (plus a `.sha256` checksum). The gowa backend fetches `releases/latest` by that exact name, verifies the checksum, caches the file, and serves it at `/`. Don't rename the asset.

## Roadmap

- [x] **M0** — scaffold: single-file build, app shell, dark mode, CI/release workflows
- [x] **M1** — connect screen, device manager, QR/pair-code login, logout/reconnect, WebSocket events
- [x] **M2** — send suite (message, image, file, video, sticker, contact, location, audio, poll, link, presence)
- [x] **M3** — message actions (delete, revoke, react, update, read, star, forward) + call reject
- [x] **M4** — groups (create, join, info, participants, settings, invite links)
- [x] **M5** — account (avatar, push name, privacy, contacts) + newsletters
- [x] **M6** — chats (list, message viewer, composer, pin, archive, disappearing timers)
- [x] **M7** — parity audit vs the embedded dashboard → v1.0.0
- [x] **v1.1.0** — per-device webhook editor (URL, secret, events, TLS verify) on the device card
- [x] **v1.1.1** — group participants viewer: table with admin badges + inline add/promote/demote/remove

Still to do: Chatwoot config module, full WebAuthn passkey flow.
