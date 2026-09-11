# Code review notes — rapidmx/electron-client

This file exists so that Claude sessions working in this repo don't re-litigate settled
decisions or re-discover the same issues from scratch. It is local to this repo (not tied to
any one machine's global Claude memory), so it travels with the code.

**Maintenance rule:** when a standing decision changes, update the section below in place
(don't just append a contradiction lower down). When a new investigation/session produces a
decision, finding, or reverted approach worth remembering, add a dated entry under Session Log.
Keep entries terse — this is a reference, not a transcript.

## Standing decisions

- **Commit discipline.** Don't `git commit` unless explicitly asked for *that specific piece of
  work*. Default to leaving changes staged/unstaged and saying so.
- **Commit message style: a flat list of one-line, verb-led items — no summary/title line, no
  `-`/`*` bullet markers.** Dictated by how `@rapidrest/cli`'s `release` command builds
  `CHANGELOG.md` from `git log` - see `rapidmx/react-shared`'s or `rapidmx/postfix-bridge`'s own
  NOTES.md for the full incident writeup. Copy this rule verbatim into each sibling repo rather
  than paraphrasing it.
- **Never bump `package.json`'s `version` field or publish this package** - it's `"private":
  true` and not meant to be published at all; version bumps here are purely cosmetic/manual.
- **This repo is intentionally minimal** - one page (`SettingsReadReceiptsPage`), no router, no
  packaging/distribution tooling. It exists to prove `@rapidmx/web-client`'s components genuinely
  run outside `@rapidrest/react`'s SSR machinery, not to be a shippable desktop app. Don't add
  scope (more pages, a real router, electron-builder) without JP asking for it explicitly.

## Session Log

### 2026-09-10 — Initial scaffold: proves the web-client-in-Electron mechanism works

Third and final phase of the `rapidmx/server` React-frontend split (see that repo's own
`.claude/NOTES.md`, 2026-09-10 entries, for the full `react-shared`/`web-client` extraction
history this builds on). Renders `SettingsReadReceiptsPage`, imported unmodified from
`@rapidmx/web-client`, in a plain Vite-bundled SPA with no SSR step at all.

- **Real login flow, not a shortcut**: main process navigates a real `BrowserWindow` to
  `auth-server`'s actual `/auth/signin` page - same-origin, no CORS/cookie concerns, exactly what
  a browser tab does. Detects completion via `did-navigate` leaving `/auth/signin` (that page's
  own `SignInFlow onSuccess` sends the browser to `/account` via `window.location.href` - see
  `src/main/index.ts`'s own doc comment), then swaps the *same* window to this shell's own
  renderer bundle.
- **`@rapidmx/react-shared`'s `apiFetch()` needed a real, backward-compatible enhancement** - it
  was hardcoded to a same-origin relative `/api${path}` fetch (fine for the SSR web/admin apps,
  always served from the same origin as their own API). Added `configureApiBaseUrl()` (mirroring
  `authApiFetch()`'s existing absolute-URL + `credentials: "include"` pattern) so this renderer -
  whose own origin is never the RapidMX server's - can point it at a real deployment. Fully
  backward compatible: unset (`""`), every other consumer's behavior is byte-for-byte unchanged -
  verified via `react-shared`'s own test suite (295/295 passing after the change, same coverage).
- **Real bug found and fixed, only visible once consumed via `web-client`'s *compiled* dist**:
  `AppShell.tsx`'s own `import "../../styles/app.css"` resolves fine when `server`'s Vite build
  bundles from raw TSX *source* (its relative import lands on real source), but breaks when
  resolved via `web-client`'s `dist/apps/**/*.js` (`tsc` never copies non-TS assets into `dist`,
  so `dist/apps/shared/styles/app.css` didn't exist at all). Fixed in `web-client`'s own `build`
  script (`shx cp` of that one CSS file into the matching `dist/` location) rather than in this
  repo - the compiled output should be a self-consistent mirror of `apps/` on its own merits, not
  something each consumer has to work around individually.
- **Tailwind v4 needed an explicit `@source` directive** - its automatic content scanning
  excludes `node_modules` by default, which is exactly where `@rapidmx/web-client`'s TSX lives
  from this repo's own perspective (a `link:`-ed sibling). Without it, `@tailwindcss/vite`
  processed the `@theme`/`@tailwind` directives (no more raw-passthrough warnings) but generated
  zero utility rules for any class `web-client`'s own components use - confirmed both ways: build
  output size dropped from ~48KB (unprocessed directives passed through raw) to ~34KB validly
  *processed* Tailwind with no scan path yet, then grepped the built CSS directly for `.bg-primary`/
  `.flex`/`.text-text-muted` (real classNames this component tree uses) to confirm they were
  actually present, not just assume it worked because the warnings went away.
- **Environment limitation, not a code defect**: this sandbox sets `ELECTRON_RUN_AS_NODE=1`
  (confirmed directly), which deliberately forces Electron into headless plain-Node mode - no
  real window can be spawned here. `yarn start`'s crash (`Cannot read properties of undefined
  (reading 'exports')`, `electron --version` printing a Node version string instead of an
  Electron one) traces entirely to this, before any of this repo's own code ever runs. Verified
  everything short of an actual GUI launch: `tsc -p tsconfig.main.json` (main+preload) clean,
  `vite build` (renderer) clean, `eslint` clean. **Not verified this session**: an actual window
  opening, the real sign-in flow against a live `auth-server`, or a live `apiFetch()`/
  `getMyProfile()` round-trip against a running `rapidmx/server`/`auth-server` - all require
  either a real display (this sandbox has none) or live sibling services (not started this
  session). See this repo's own README for the CORS/`SameSite` prerequisites those live services
  still need before any of that would work end to end.
- Not committed - same standing rule; JP reviews and commits when ready.
