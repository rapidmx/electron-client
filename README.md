# RapidMX: Desktop Client

An Electron shell around [`@rapidmx/web-client`](https://github.com/rapidmx/web-client)'s React UI — the
same components [`rapidmx/server`](https://github.com/rapidmx/server) server-renders, running here as a
plain client-side SPA with no SSR step at all. This repo is deliberately small: it proves the "same source
builds the web client, the server, and a desktop app" split actually works, rendering one real page
(`SettingsReadReceiptsPage`, under Settings → Read Receipts) end to end against a real running
`rapidmx/server` + `auth-server`.

## How it works

1. On launch, the main process opens a window and navigates it to `auth-server`'s real sign-in page
   (`${RAPIDMX_AUTH_SERVER_URL}/auth/signin`) — a normal page load, not a webview embedded in this
   shell's own UI. There's no code-level integration with `auth-server` at all here; it has no idea an
   Electron shell is the one loading it.
2. Once sign-in completes (detected as "navigated away from `/auth/signin`" — see
   `src/main/index.ts`), the **same window** swaps to this shell's own renderer bundle (the Vite dev
   server in development, `dist/renderer/index.html` otherwise).
3. The renderer asks auth-server who the signed-in caller is (`getMyProfile()`), then renders
   `SettingsReadReceiptsPage` imported directly from `@rapidmx/web-client` — completely unmodified,
   the exact same component `rapidmx/server` renders server-side.
4. Every `@rapidmx/react-shared` API call this page makes now targets `RAPIDMX_SERVER_URL`/
   `RAPIDMX_AUTH_SERVER_URL` explicitly (`configureApiBaseUrl()`, see `src/renderer/main.tsx`) instead of
   the same-origin relative path every other consumer of that library uses — this renderer's own origin
   is never the same as either server's.

## Required server-side configuration

This shell's renderer runs on its **own origin** (the Vite dev server's `http://localhost:5173` in
development; a packaged app's own origin otherwise) — genuinely different from both `rapidmx/server`'s
and `auth-server`'s origins. Two things must be configured on **their** side for step 4 above to work;
neither is something this repo can do for you:

- **CORS**: both `rapidmx/server` and `auth-server` need this shell's renderer origin added to their own
  `cors:origins` config (`@rapidrest/service-core`'s `Server.js` only sets
  `access-control-allow-credentials` for an origin that's explicitly allow-listed — the default
  "allow every origin" behavior when `cors:origins` is unset does **not** carry credentials, so a
  cross-origin `fetch()` would receive a response but the browser would refuse to read it). For local
  dev against the Vite dev server, add `http://localhost:5173` to both.
- **Cookie `SameSite`**: the `jwt` cookie `auth-server` sets on sign-in must be sendable on a
  cross-origin request for `configureApiBaseUrl()`-driven calls to carry it at all. On `localhost`,
  different ports count as the same "site" for `SameSite=Lax` purposes (the default, and likely already
  sufficient for local dev against the Vite dev server) — but a real packaged build's own origin (a
  `file://` path or a custom protocol) is a genuinely different site, which `SameSite=Lax` does **not**
  cover. Shipping a real packaged build needs `auth-server`'s sign-in cookie issued with
  `SameSite=None; Secure` instead — a security-relevant change in a different repo, not something to
  change unilaterally from here; flagging it as the one remaining prerequisite for a production build of
  this shell, not solved by this repo alone.

## Getting started

```bash
git clone https://github.com/rapidmx/electron-client
cd electron-client
corepack enable
yarn install
RAPIDMX_SERVER_URL=http://localhost:3000 RAPIDMX_AUTH_SERVER_URL=http://localhost:3001 yarn dev
```

Both env vars default to exactly those values (matching `rapidmx/server`'s own local `docker compose`/
`yarn dev` setup) — only set them if your server/auth-server run elsewhere.

`yarn dev` runs the Vite dev server, watches/rebuilds the main process on change, and launches Electron
once both are ready. `yarn build` produces a real `dist/` (main + renderer) for `yarn start` to run
without the dev server — packaging that into an actual installable app (electron-builder/Forge) isn't set
up here yet.

## What this repo deliberately does not do

- No packaging/distribution tooling (electron-builder, code signing, auto-update) — this proves the
  rendering/build mechanism, not a shippable installer.
- No offline/local persistence — every render depends on a live `rapidmx/server` + `auth-server`.
- No navigation beyond the one page this shell mounts — a real desktop client would need its own router
  wired to more of `@rapidmx/web-client`'s pages, which this repo doesn't attempt.
