///////////////////////////////////////////////////////////////////////////////
// Copyright (C) 2026 Jean-Philippe Steinmetz
// SPDX-License-Identifier: MPL-2.0
///////////////////////////////////////////////////////////////////////////////
import { contextBridge, ipcRenderer } from "electron";

/**
 * Runs with Node access in an isolated context (`contextIsolation: true`, `nodeIntegration: false` - see
 * `index.ts`'s `createRendererWindow()`) - the renderer itself gets no Node/Electron API surface beyond
 * exactly what's exposed here. `getConfig()` is a one-shot IPC round-trip (not a preload-time constant)
 * because the renderer window is created fresh, after sign-in, well after the main process already knows
 * the real config - see `index.ts`'s `ipcMain.handle("rapidmx:get-config", ...)`.
 */
contextBridge.exposeInMainWorld("rapidmx", {
    getConfig: () => ipcRenderer.invoke("rapidmx:get-config"),
});
