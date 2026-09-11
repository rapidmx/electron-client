///////////////////////////////////////////////////////////////////////////////
// Copyright (C) 2026 Jean-Philippe Steinmetz
// SPDX-License-Identifier: MPL-2.0
///////////////////////////////////////////////////////////////////////////////
import path from "node:path";
import { fileURLToPath } from "node:url";
import { app, BrowserWindow, ipcMain } from "electron";
import { loadConfig, RapidMxConfig } from "./config.js";

const moduleDir = path.dirname(fileURLToPath(import.meta.url));
const config: RapidMxConfig = loadConfig();

/**
 * Dev-mode signal: set only by this repo's own `yarn dev:electron` script, pointing at the Vite dev
 * server (see `vite.config.ts`'s fixed port). Deliberately not `!app.isPackaged` - that's also `false`
 * for `yarn start` against a locally-built-but-unpackaged `dist/renderer`, which needs the *other*
 * branch below (`loadFile`, not `loadURL`).
 */
const rendererDevServerUrl: string | undefined = process.env.ELECTRON_RENDERER_URL;

ipcMain.handle("rapidmx:get-config", () => config);

/**
 * Loads the renderer bundle into `window` - the Vite dev server in development, or the built
 * `dist/renderer/index.html` otherwise. Called only once real sign-in against `authServerUrl` has
 * already completed in this same window (see `createSignInWindow()`) - the renderer itself never
 * handles credentials directly, it only ever calls the already-authenticated RapidMX/auth-server APIs
 * (see `src/renderer/main.tsx`).
 */
async function loadRenderer(window: BrowserWindow): Promise<void> {
    if (rendererDevServerUrl) {
        await window.loadURL(rendererDevServerUrl);
    } else {
        await window.loadFile(path.join(moduleDir, "../renderer/index.html"));
    }
}

/**
 * The entire window lifecycle: sign in against the real `auth-server` (a normal page load - no CORS/
 * cookie concerns at all, since this is exactly what a browser tab visiting that page does), then swap
 * the same window's content to this shell's own renderer bundle once sign-in has genuinely completed.
 *
 * "Completed" is detected as "navigated away from `/auth/signin`" - `SignInFlow`'s own `onSuccess`
 * handler (`apps/www/auth/signin.tsx` in the `auth-server` repo) sends the browser to `/account` (or a
 * safe same-origin `?returnTo=`) via a plain `window.location.href` assignment on success, which this
 * window's own `did-navigate` event sees exactly like a real browser would. There is no IPC/postMessage
 * contract between `auth-server`'s page and this shell - deliberately so, since `auth-server` has no
 * reason to know an Electron shell is even the one loading it.
 */
function createSignInWindow(): void {
    const window = new BrowserWindow({
        width: 1280,
        height: 860,
        webPreferences: {
            preload: path.join(moduleDir, "preload.js"),
            contextIsolation: true,
            nodeIntegration: false,
            sandbox: true,
        },
    });

    let signedIn = false;
    window.webContents.on("did-navigate", (_event, url) => {
        if (signedIn) {
            return;
        }
        if (!new URL(url).pathname.startsWith("/auth/signin")) {
            signedIn = true;
            void loadRenderer(window);
        }
    });

    void window.loadURL(`${config.authServerUrl}/auth/signin`);
}

void app.whenReady().then(() => {
    createSignInWindow();

    // macOS convention: re-create a window when the dock icon is clicked with none open.
    app.on("activate", () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createSignInWindow();
        }
    });
});

app.on("window-all-closed", () => {
    if (process.platform !== "darwin") {
        app.quit();
    }
});
