///////////////////////////////////////////////////////////////////////////////
// Copyright (C) 2026 Jean-Philippe Steinmetz
// SPDX-License-Identifier: MPL-2.0
///////////////////////////////////////////////////////////////////////////////
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { loadConfig } from "../../src/main/config.js";

describe("loadConfig", () => {
    const originalServerUrl = process.env.RAPIDMX_SERVER_URL;
    const originalAuthServerUrl = process.env.RAPIDMX_AUTH_SERVER_URL;

    beforeEach(() => {
        delete process.env.RAPIDMX_SERVER_URL;
        delete process.env.RAPIDMX_AUTH_SERVER_URL;
    });

    afterEach(() => {
        if (originalServerUrl === undefined) {
            delete process.env.RAPIDMX_SERVER_URL;
        } else {
            process.env.RAPIDMX_SERVER_URL = originalServerUrl;
        }
        if (originalAuthServerUrl === undefined) {
            delete process.env.RAPIDMX_AUTH_SERVER_URL;
        } else {
            process.env.RAPIDMX_AUTH_SERVER_URL = originalAuthServerUrl;
        }
    });

    it("defaults to localhost when no env vars are set", () => {
        expect(loadConfig()).toEqual({
            serverUrl: "http://localhost:3000",
            authServerUrl: "http://localhost:3001",
        });
    });

    it("uses RAPIDMX_SERVER_URL and RAPIDMX_AUTH_SERVER_URL when set", () => {
        process.env.RAPIDMX_SERVER_URL = "https://mail.example.com";
        process.env.RAPIDMX_AUTH_SERVER_URL = "https://auth.example.com";

        expect(loadConfig()).toEqual({
            serverUrl: "https://mail.example.com",
            authServerUrl: "https://auth.example.com",
        });
    });
});
