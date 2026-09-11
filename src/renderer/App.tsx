///////////////////////////////////////////////////////////////////////////////
// Copyright (C) 2026 Jean-Philippe Steinmetz
// SPDX-License-Identifier: MPL-2.0
///////////////////////////////////////////////////////////////////////////////
import React, { useEffect, useState } from "react";
import { getMyProfile } from "@rapidmx/react-shared/profileApi.js";
import SettingsReadReceiptsPage from "@rapidmx/web-client/www/settings/read-receipts/index.js";

export interface AppProps {
    authServerUrl: string;
}

/**
 * Proves the actual point of this repo: `SettingsReadReceiptsPage` is imported unmodified from
 * `@rapidmx/web-client` - the exact same component `rapidmx/server` server-renders at `/settings/
 * read-receipts` - just mounted directly by this shell instead of behind `@rapidrest/react`'s SSR/
 * hydration machinery, which has no role here at all (see `main.tsx`'s own doc comment).
 *
 * `userUid` has no SSR `fetchProps` to come from here (there is no SSR step in this shell at all) - it's
 * resolved the only way a already-signed-in caller can identify itself to a stateless API: asking
 * auth-server who the caller's `jwt` cookie belongs to, exactly like `UserMenu.tsx`'s own avatar/name
 * already does server-side.
 */
export default function App({ authServerUrl }: AppProps): React.ReactElement {
    const [userUid, setUserUid] = useState<string | undefined>(undefined);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        getMyProfile(authServerUrl)
            .then((profile) => setUserUid(profile.uid))
            .catch((err: unknown) => setError(err instanceof Error ? err.message : "Could not load your profile."));
    }, [authServerUrl]);

    if (error) {
        return (
            <div style={{ padding: "2rem", fontFamily: "sans-serif" }}>
                <p>Could not load your profile: {error}</p>
                <p>Confirm auth-server&apos;s CORS config allows this app&apos;s origin (see this repo&apos;s README).</p>
            </div>
        );
    }

    if (!userUid) {
        return <div style={{ padding: "2rem", fontFamily: "sans-serif" }}>Loading…</div>;
    }

    return <SettingsReadReceiptsPage userUid={userUid} authServerUrl={authServerUrl} />;
}
