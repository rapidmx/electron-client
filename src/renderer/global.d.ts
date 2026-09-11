///////////////////////////////////////////////////////////////////////////////
// Copyright (C) 2026 Jean-Philippe Steinmetz
// SPDX-License-Identifier: MPL-2.0
///////////////////////////////////////////////////////////////////////////////
import type { RapidMxConfig } from "../main/config.js";

declare global {
    interface Window {
        /** Exposed by `src/main/preload.ts` via `contextBridge` - the renderer's only channel back to
         * the main process, deliberately limited to this one read-only config fetch. */
        rapidmx: {
            getConfig: () => Promise<RapidMxConfig>;
        };
    }
}

export {};
