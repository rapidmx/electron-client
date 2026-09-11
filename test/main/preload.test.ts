///////////////////////////////////////////////////////////////////////////////
// Copyright (C) 2026 Jean-Philippe Steinmetz
// SPDX-License-Identifier: MPL-2.0
///////////////////////////////////////////////////////////////////////////////
import { describe, it, expect, vi } from "vitest";

const mockExposeInMainWorld = vi.fn();
const mockInvoke = vi.fn();

vi.mock("electron", () => ({
    contextBridge: { exposeInMainWorld: mockExposeInMainWorld },
    ipcRenderer: { invoke: mockInvoke },
}));

describe("preload", () => {
    it("exposes a rapidmx.getConfig bridge that invokes the rapidmx:get-config channel", async () => {
        await import("../../src/main/preload.js");

        expect(mockExposeInMainWorld).toHaveBeenCalledTimes(1);
        const [key, bridge] = mockExposeInMainWorld.mock.calls[0] as [string, { getConfig: () => unknown }];
        expect(key).toBe("rapidmx");

        bridge.getConfig();
        expect(mockInvoke).toHaveBeenCalledWith("rapidmx:get-config");
    });
});
