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
  work*. An autonomous-execution/"commit as you go" approval given for one approved plan (e.g. via
  plan mode) is scoped to that plan only — it does not carry forward to later, separate requests in
  the same session, even ones that look similar in kind (a follow-up review-and-fix pass, a
  refactor, a new feature), and even after a full review-and-fix cycle with passing tests. Default
  to leaving changes staged/unstaged and saying so; only commit automatically within the exact
  scope of a plan that was explicitly approved as autonomous. If unsure whether new work falls
  inside that scope, treat it as outside and ask.
- **Commit message style: a flat list of one-line, verb-led items — no summary/title line, no
  `-`/`*` bullet markers.** This isn't just a style preference — it's dictated by how `release`
  (`@rapidrest/cli`) actually builds `CHANGELOG.md`. `collectChangelogBullets`/
  `classifyChangelogLine` (that repo's `src/lib/release.ts`) parse `git log --pretty=format:%B` and
  treat **every non-blank line of a commit's full message as its own changelog bullet** — there is
  no subject/body distinction. A conventional "short imperative subject + blank line + prose body"
  commit therefore leaks one changelog bullet per body sentence, and a `-`/`*`-prefixed line breaks
  `classifyChangelogLine`'s verb detection (it reads the line's first whitespace-delimited word as
  the verb; a leading `-` defeats that lookup and the dash leaks into the changelog text as
  `"- - Added foo"`). Correct format:
  - No separate summary/title line — if a commit needs an overview, that overview is itself just
    one more flat line, not a heading distinct from the rest.
  - No bullet-marker prefix of any kind — write bare lines.
  - Lead each line with an imperative verb where it fits: `Add`/`Fix`/`Remove` (and `-ing` forms)
    are recognized and become `Added`/`Fixed`/`Removed` entries; `Configuring`/`Converting`/
    `Refactoring`/`Updating`/etc. become `Changed`. Anything else still works, defaulting to
    `Changed` verbatim — see `CHANGELOG_VERB_REWRITES` in that repo's `src/lib/release.ts` for the
    full map.
  - A blank line before a trailing git trailer (`Co-Authored-By:`, `Signed-off-by:`, etc.) is fine
    — trailers matching `CHANGELOG_NOISE_PATTERNS` are dropped from the changelog — but nothing
    else should follow the item list.
  This mirrors JP's standing convention across his other repos; copy this exact rule verbatim into
  each sibling repo's own NOTES.md rather than paraphrasing it, since the paraphrase is what caused
  this to be gotten wrong in the first place (see `@rapidrest/cli`'s own NOTES.md, 2026-09-07 entry,
  for the full incident writeup and the `CHANGELOG_NOISE_PATTERNS` fix that accompanied it).
- **Never bump a `package.json` `version` field, in this repo or any sibling `@rapidrest/*` repo,
  and never publish/`npm publish` one.** JP has a formal release process for that (see e.g.
  `mail-server`'s own `"version"`/`"postversion"` npm-lifecycle scripts, which sync the Helm
  chart/README and push tags — a manual version edit bypasses all of that and produces conflicts).
  This applies even when a fix in a sibling repo is otherwise done and verified: land the source
  fix, leave the version field alone, and tell JP it's ready for him to version/publish himself.
  Once he publishes, bump *this* repo's dependency constraint (e.g. `"@rapidrest/auth": "^X.Y.Z"`)
  to the version he actually published — that part is fine, since it's just declaring what this
  repo needs, not deciding a sibling repo's own release number.
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

### 2026-09-11 — Test infrastructure added: 100% coverage, real CONTRIBUTING.md

This repo had zero tests until now. Added a full Vitest setup (`vitest.config.ts`,
`test/setup.ts`, `@testing-library/react`+`jest-dom`, `jsdom`) mirroring `web-client`'s own
config, with a `src/**` coverage threshold pinned to 100% across statements/branches/functions/
lines (JP: "I want everythign to have 100% code coverage across all repos, where possible").

- **`src/main/index.ts`'s `loadRenderer`/`createSignInWindow` were made `export`ed** purely so
  tests can call them directly - both were previously module-private. No behavior change.
- **`electron` itself is fully mocked** (`vi.mock("electron", ...)`, `app`/`BrowserWindow`/
  `ipcMain` as plain `vi.fn()`s) - there is no real Electron runtime available in test (or this
  sandbox generally - see 2026-09-10's `ELECTRON_RUN_AS_NODE` entry above). `BrowserWindow` is
  mocked as a real `function` (not an arrow function) so `new BrowserWindow(...)` and
  `.mock.instances`/`.mock.results` both work.
- **`src/main/index.ts` has module-level side effects** (registers `ipcMain.handle` and
  `app.on(...)` at import time, and calls `createSignInWindow()` inside `app.whenReady().then()`)
  - every test does `vi.resetModules()` + a fresh dynamic `import()` per scenario, then either
    inspects the mock call history directly or invokes a captured handler/callback. Same pattern
    for `src/renderer/main.tsx` (also side-effecting at import time via
    `window.rapidmx.getConfig().then(...)`) - wrapped in `@testing-library/react`'s `act()` since
    that `.then()` callback calls `createRoot(...).render(...)` outside of any `render()` call the
    test itself makes.
- **`vi.mock()` targets for this repo's own relative imports must be given relative to the test
  file, not the file under test** - e.g. `src/renderer/main.tsx`'s own `import "./styles.css"` had
  to be mocked from `test/renderer/main.test.tsx` as `vi.mock("../../src/renderer/styles.css", ...)`,
  not `"./styles.css"` (which would target a nonexistent `test/renderer/styles.css`).
- Fixed `CONTRIBUTING.md`'s bug-report/feature-request examples, which were still the generic
  RapidMX template's `@rapidrest`-flavored ones (`ModelRoute`/`@Route`/MongoDB, `@rapidrest/core`
  version reporting) - none of that applies to an Electron shell. Replaced with an
  Electron-appropriate example (sign-in → renderer handoff) and Project Info fields (app version,
  Electron version, OS) - same issue likely exists in other sibling repos' `CONTRIBUTING.md`
  (confirmed present in `react-shared`'s too) but out of scope here; only this repo's copy was
  fixed.
- Not committed - same standing rule; JP said "hold off on commit" explicitly this session.

## Future work

- **Server bootstrap (deferred — JP: "a future task once the pre-requisite work is completed in
  restapi").** Today this app only knows which `server`/`auth-server` to point at via
  `RAPIDMX_SERVER_URL`/`RAPIDMX_AUTH_SERVER_URL` env vars (or their hardcoded `localhost`
  defaults) - fine for this dev-mode spike, not viable once this app is packaged and installed
  for arbitrary RapidMX users on arbitrary domains. The intended real mechanism: prompt for the
  user's email address, then resolve their domain's `_rapidmx.<domain>` DNS TXT record
  (`v=RMXv1; id=<id>; host=<host>;`) to find their server - documented in `restapi`'s
  `specs/end-to-end_encryption.md` ("Domain Lookup" section) and already implemented server-side
  for federated key discovery in `restapi/src/util/FederationUtils.ts`
  (`resolveFederationPolicy()`/`parsePolicyRecord()` - the exact parsing rules to mirror, not
  reinvent, when this is picked up).
  - That module's own doc comment frames `host` as "the peer's RapidMX server, serving its
    `.well-known/rapidmx/keys/:hash` endpoint" - reasonable to also treat as the same server's
    general API host (nothing in the spec suggests a separate key-only host), but worth
    confirming when this is actually implemented, not assumed.
  - **Real gap, not yet answered by anything in the spec**: the TXT record only yields `server`'s
    own host, not `auth-server`'s - a separate deployment with its own hostname (see
    `rapidmx/server`'s own `mail:auth_server_url` config, and its Helm chart's own
    `authServer.host` default of `auth.<mainHost>` - a *convention*, not something DNS-discoverable
    or spec'd as guaranteed). Whatever "pre-requisite work" lands in `restapi` should settle how a
    client learns `authServerUrl` too - a new unauthenticated discovery endpoint returning it
    alongside (or instead of) relying on an `auth.` hostname convention seems the more robust
    shape, but that's `restapi`'s design call, not this repo's.
  - Don't reimplement `FederationUtils.ts`'s DNS-parsing logic from scratch by hand here when this
    is picked up - Node's own `dns.promises.resolveTxt()` is directly usable from this app's main
    process (unlike a plain browser client, which the spec explicitly calls out as unable to do
    DNS lookups at all - Electron's main process doesn't have that limitation), so the actual gap
    to close is *just* the auth-server question above plus this app's own prompt/persistence UI
    around it, not the DNS mechanism itself.
