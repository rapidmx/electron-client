///////////////////////////////////////////////////////////////////////////////
// Copyright (C) 2026 Jean-Philippe Steinmetz
// SPDX-License-Identifier: MPL-2.0
///////////////////////////////////////////////////////////////////////////////
import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";

const mockGetMyProfile = vi.fn();

vi.mock("@rapidmx/react-shared/profileApi.js", () => ({
    getMyProfile: mockGetMyProfile,
}));

vi.mock("@rapidmx/web-client/www/settings/read-receipts/index.js", () => ({
    default: (props: { userUid?: string; authServerUrl: string }) => (
        <div data-testid="read-receipts-page">
            {props.userUid} / {props.authServerUrl}
        </div>
    ),
}));

const { default: App } = await import("../../src/renderer/App.js");

describe("App", () => {
    it("shows a loading state until the profile resolves", () => {
        mockGetMyProfile.mockReturnValue(new Promise(() => undefined));

        render(<App authServerUrl="https://auth.example.com" />);

        expect(screen.getByText("Loading…")).toBeInTheDocument();
    });

    it("renders SettingsReadReceiptsPage with the resolved uid once the profile loads", async () => {
        mockGetMyProfile.mockResolvedValue({ uid: "user-1" });

        render(<App authServerUrl="https://auth.example.com" />);

        await waitFor(() => expect(screen.getByTestId("read-receipts-page")).toBeInTheDocument());
        expect(screen.getByTestId("read-receipts-page")).toHaveTextContent("user-1 / https://auth.example.com");
        expect(mockGetMyProfile).toHaveBeenCalledWith("https://auth.example.com");
    });

    it("shows the error's message when the profile fetch rejects with an Error", async () => {
        mockGetMyProfile.mockRejectedValue(new Error("network down"));

        render(<App authServerUrl="https://auth.example.com" />);

        await waitFor(() => expect(screen.getByText(/Could not load your profile: network down/)).toBeInTheDocument());
    });

    it("shows a generic message when the profile fetch rejects with a non-Error", async () => {
        mockGetMyProfile.mockRejectedValue("boom");

        render(<App authServerUrl="https://auth.example.com" />);

        await waitFor(() =>
            expect(screen.getByText(/Could not load your profile: Could not load your profile\./)).toBeInTheDocument(),
        );
    });
});
