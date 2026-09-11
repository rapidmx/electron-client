///////////////////////////////////////////////////////////////////////////////
// Copyright (C) 2026 Jean-Philippe Steinmetz
// SPDX-License-Identifier: MPL-2.0
///////////////////////////////////////////////////////////////////////////////
import "./styles.css";
import React from "react";
import { createRoot } from "react-dom/client";
import { configureApiBaseUrl } from "@rapidmx/react-shared/api.js";
import App from "./App.js";

/**
 * This shell's entire reason to exist: everything below runs unmodified `@rapidmx/web-client` React
 * components (see `App.tsx`) in a plain Vite SPA, with `@rapidrest/react`'s SSR/hydration machinery
 * (`ReactRoute`, `appDir` scanning, `fetchProps`, ...) - `rapidmx/server`'s own mechanism for rendering
 * this exact same code - entirely absent. This process only ever runs `main.tsx`'s `import()`-time code
 * once, by `index.html`'s own `<script type="module">` tag, after `src/main/index.ts` has already
 * completed a real sign-in against auth-server in this same window.
 *
 * `configureApiBaseUrl()` (see `@rapidmx/react-shared`'s `api.ts`) is what makes this possible at all -
 * every other consumer of `apiFetch()` (the SSR web/admin apps) is served from the same origin as the
 * API it calls and never needed this; this renderer's own origin (the Vite dev server, or a packaged
 * app's local file origin) is never the RapidMX server's own origin, so every `apiFetch()` call needs to
 * both target an explicit absolute origin and carry credentials cross-origin - both jobs this one call
 * configures for the whole renderer process.
 */
window.rapidmx
    .getConfig()
    .then(({ serverUrl, authServerUrl }) => {
        configureApiBaseUrl(serverUrl);

        const container = document.getElementById("root");
        if (!container) {
            throw new Error("#root element not found");
        }
        createRoot(container).render(
            <React.StrictMode>
                <App authServerUrl={authServerUrl} />
            </React.StrictMode>,
        );
    })
    .catch((err: unknown) => {
        // The one thing that can fail here (the preload IPC round-trip itself) has nowhere else to
        // report to - there's no React tree mounted yet for it to show up in.
        document.body.textContent = `Failed to start: ${err instanceof Error ? err.message : String(err)}`;
    });
