///////////////////////////////////////////////////////////////////////////////
// Copyright (C) 2026 Jean-Philippe Steinmetz
// SPDX-License-Identifier: MPL-2.0
///////////////////////////////////////////////////////////////////////////////
import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { act } from "@testing-library/react";

const mockConfigureApiBaseUrl = vi.fn();
const mockGetConfig = vi.fn();

vi.mock("../../src/renderer/styles.css", () => ({}));

vi.mock("@rapidmx/react-shared/api.js", () => ({
    configureApiBaseUrl: mockConfigureApiBaseUrl,
}));

vi.mock("../../src/renderer/App.js", () => ({
    default: (props: { authServerUrl: string }) => <div data-testid="app">{props.authServerUrl}</div>,
}));

async function importMainFresh(): Promise<void> {
    vi.resetModules();
    // `main.ts`'s own `.then()` callback calls `createRoot(...).render(...)` as a side effect of the
    // import itself, outside of any render() call this test makes - wrap it in act() so that state
    // update isn't flagged as happening outside of React's control.
    await act(async () => {
        await import("../../src/renderer/main.js");
    });
}

describe("renderer/main", () => {
    beforeEach(() => {
        document.body.innerHTML = "";
        (window as unknown as { rapidmx: unknown }).rapidmx = { getConfig: mockGetConfig };
    });

    it("configures the api base url and mounts App into #root on success", async () => {
        document.body.innerHTML = '<div id="root"></div>';
        mockGetConfig.mockResolvedValue({
            serverUrl: "https://mail.example.com",
            authServerUrl: "https://auth.example.com",
        });

        await importMainFresh();
        await vi.waitFor(() => expect(mockConfigureApiBaseUrl).toHaveBeenCalledWith("https://mail.example.com"));
        await vi.waitFor(() => expect(document.querySelector('[data-testid="app"]')).not.toBeNull());
        expect(document.querySelector('[data-testid="app"]')?.textContent).toBe("https://auth.example.com");
    });

    it("reports a failure to the page when #root is missing", async () => {
        mockGetConfig.mockResolvedValue({
            serverUrl: "https://mail.example.com",
            authServerUrl: "https://auth.example.com",
        });

        await importMainFresh();
        await vi.waitFor(() => expect(document.body.textContent).toBe("Failed to start: #root element not found"));
    });

    it("reports the error's message when getConfig rejects with an Error", async () => {
        document.body.innerHTML = '<div id="root"></div>';
        mockGetConfig.mockRejectedValue(new Error("ipc broke"));

        await importMainFresh();
        await vi.waitFor(() => expect(document.body.textContent).toBe("Failed to start: ipc broke"));
    });

    it("reports a stringified failure when getConfig rejects with a non-Error", async () => {
        document.body.innerHTML = '<div id="root"></div>';
        mockGetConfig.mockRejectedValue("boom");

        await importMainFresh();
        await vi.waitFor(() => expect(document.body.textContent).toBe("Failed to start: boom"));
    });
});
