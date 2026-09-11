///////////////////////////////////////////////////////////////////////////////
// Copyright (C) 2026 Jean-Philippe Steinmetz
// SPDX-License-Identifier: MPL-2.0
///////////////////////////////////////////////////////////////////////////////

/**
 * The two RapidMX origins this shell talks to - both real, separately-deployed services, matching
 * exactly how `rapidmx/server`'s own SSR pages already relate to `auth-server` (see that repo's
 * `mail__auth_server_url` config). Defaults assume both are running locally via that repo's own
 * `docker compose`/`yarn dev` setup.
 */
export interface RapidMxConfig {
    /** Base origin of the RapidMX server this shell renders data from (e.g. `mailApi`/`calendarApi`). */
    serverUrl: string;
    /** Base origin of the separate auth-server deployment this shell signs in against. */
    authServerUrl: string;
}

export function loadConfig(): RapidMxConfig {
    return {
        serverUrl: process.env.RAPIDMX_SERVER_URL ?? "http://localhost:3000",
        authServerUrl: process.env.RAPIDMX_AUTH_SERVER_URL ?? "http://localhost:3001",
    };
}
