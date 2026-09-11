///////////////////////////////////////////////////////////////////////////////
// Copyright (C) 2026 Jean-Philippe Steinmetz
// SPDX-License-Identifier: MPL-2.0
///////////////////////////////////////////////////////////////////////////////
import { describe, it, expect, vi, beforeEach } from "vitest";

const mockHandle = vi.fn();
const mockAppOn = vi.fn();
const mockWhenReady = vi.fn();
const mockQuit = vi.fn();
const mockGetAllWindows = vi.fn(() => [] as unknown[]);

// `new BrowserWindow(...)` needs a real constructor function (not an arrow function) so `new` works and
// `mockBrowserWindow.mock.instances`/`.mock.calls` can be inspected per test.
const mockBrowserWindow = vi.fn(function (this: Record<string, unknown>, opts: unknown) {
    this.__opts = opts;
    this.webContents = { on: vi.fn() };
    this.loadURL = vi.fn().mockResolvedValue(undefined);
    this.loadFile = vi.fn().mockResolvedValue(undefined);
}) as unknown as { new (opts: unknown): any; mock: any; getAllWindows: () => unknown[] };
(mockBrowserWindow as unknown as { getAllWindows: unknown }).getAllWindows = mockGetAllWindows;

vi.mock("electron", () => ({
    app: {
        whenReady: mockWhenReady,
        on: mockAppOn,
        quit: mockQuit,
    },
    BrowserWindow: mockBrowserWindow,
    ipcMain: { handle: mockHandle },
}));

async function importIndexFresh(): Promise<typeof import("../../src/main/index.js")> {
    vi.resetModules();
    return import("../../src/main/index.js");
}

describe("main/index", () => {
    beforeEach(() => {
        delete process.env.RAPIDMX_SERVER_URL;
        delete process.env.RAPIDMX_AUTH_SERVER_URL;
        delete process.env.ELECTRON_RENDERER_URL;
        mockWhenReady.mockReturnValue(Promise.resolve());
        mockGetAllWindows.mockReturnValue([]);
    });

    it("registers an ipcMain handler that returns the loaded config", async () => {
        process.env.RAPIDMX_SERVER_URL = "https://mail.example.com";
        process.env.RAPIDMX_AUTH_SERVER_URL = "https://auth.example.com";

        await importIndexFresh();

        expect(mockHandle).toHaveBeenCalledWith("rapidmx:get-config", expect.any(Function));
        const handler = mockHandle.mock.calls[0][1] as () => unknown;
        expect(handler()).toEqual({
            serverUrl: "https://mail.example.com",
            authServerUrl: "https://auth.example.com",
        });
    });

    it("creates a sign-in window pointed at authServerUrl once ready", async () => {
        process.env.RAPIDMX_AUTH_SERVER_URL = "https://auth.example.com";

        const mod = await importIndexFresh();
        await vi.waitFor(() => expect(mockBrowserWindow).toHaveBeenCalledTimes(1));

        const window = mockBrowserWindow.mock.results[0].value;
        expect(window.loadURL).toHaveBeenCalledWith("https://auth.example.com/auth/signin");
        expect(mod.createSignInWindow).toBeInstanceOf(Function);
    });

    it("swaps to the renderer once did-navigate leaves /auth/signin, and only once", async () => {
        process.env.RAPIDMX_AUTH_SERVER_URL = "https://auth.example.com";
        process.env.ELECTRON_RENDERER_URL = "http://localhost:5173";

        await importIndexFresh();
        await vi.waitFor(() => expect(mockBrowserWindow).toHaveBeenCalledTimes(1));

        const window = mockBrowserWindow.mock.results[0].value;
        const didNavigate = window.webContents.on.mock.calls.find(
            (call: unknown[]) => call[0] === "did-navigate",
        )[1] as (event: unknown, url: string) => void;

        didNavigate(undefined, "https://auth.example.com/auth/signin");
        expect(window.loadURL).toHaveBeenCalledTimes(1);

        didNavigate(undefined, "https://auth.example.com/account");
        await vi.waitFor(() => expect(window.loadURL).toHaveBeenCalledWith("http://localhost:5173"));

        didNavigate(undefined, "https://auth.example.com/account?again=1");
        expect(window.loadURL).toHaveBeenCalledTimes(2);
    });

    it("loadRenderer loads the dev server URL when ELECTRON_RENDERER_URL is set", async () => {
        process.env.ELECTRON_RENDERER_URL = "http://localhost:5173";
        const mod = await importIndexFresh();

        const window = { loadURL: vi.fn().mockResolvedValue(undefined), loadFile: vi.fn().mockResolvedValue(undefined) };
        await mod.loadRenderer(window as any);

        expect(window.loadURL).toHaveBeenCalledWith("http://localhost:5173");
        expect(window.loadFile).not.toHaveBeenCalled();
    });

    it("loadRenderer loads the built index.html when ELECTRON_RENDERER_URL is unset", async () => {
        const mod = await importIndexFresh();

        const window = { loadURL: vi.fn().mockResolvedValue(undefined), loadFile: vi.fn().mockResolvedValue(undefined) };
        await mod.loadRenderer(window as any);

        expect(window.loadFile).toHaveBeenCalledWith(expect.stringMatching(/renderer[\\/]index\.html$/));
        expect(window.loadURL).not.toHaveBeenCalled();
    });

    it("creates a new sign-in window on activate only when no windows are open", async () => {
        await importIndexFresh();
        await vi.waitFor(() => expect(mockAppOn).toHaveBeenCalledWith("activate", expect.any(Function)));

        const activateHandler = mockAppOn.mock.calls.find((call) => call[0] === "activate")[1] as () => void;
        const windowCountBefore = mockBrowserWindow.mock.calls.length;

        mockGetAllWindows.mockReturnValue([{}]);
        activateHandler();
        expect(mockBrowserWindow.mock.calls.length).toBe(windowCountBefore);

        mockGetAllWindows.mockReturnValue([]);
        activateHandler();
        expect(mockBrowserWindow.mock.calls.length).toBe(windowCountBefore + 1);
    });

    it("quits the app on window-all-closed for non-darwin platforms", async () => {
        await importIndexFresh();

        const originalPlatform = process.platform;
        Object.defineProperty(process, "platform", { value: "win32" });
        try {
            const handler = mockAppOn.mock.calls.find((call) => call[0] === "window-all-closed")[1] as () => void;
            handler();
            expect(mockQuit).toHaveBeenCalledTimes(1);
        } finally {
            Object.defineProperty(process, "platform", { value: originalPlatform });
        }
    });

    it("does not quit the app on window-all-closed for darwin", async () => {
        await importIndexFresh();

        const originalPlatform = process.platform;
        Object.defineProperty(process, "platform", { value: "darwin" });
        try {
            const handler = mockAppOn.mock.calls.find((call) => call[0] === "window-all-closed")[1] as () => void;
            handler();
            expect(mockQuit).not.toHaveBeenCalled();
        } finally {
            Object.defineProperty(process, "platform", { value: originalPlatform });
        }
    });
});
