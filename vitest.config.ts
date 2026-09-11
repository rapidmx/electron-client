import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

// Covers both processes from one config - src/main (plain Node, `electron` mocked via vi.mock) and
// src/renderer (React components, needs a DOM). jsdom works fine for both: main-process tests never
// touch the DOM, they just don't need jsdom's absence either.
export default defineConfig({
    plugins: [react()],
    // Same fix as vite.config.ts - @rapidmx/web-client and @rapidmx/react-shared are link:-ed siblings
    // with their own independent devDependency copies of React, which would otherwise resolve as a
    // second instance and break every hook with "Invalid hook call".
    resolve: {
        dedupe: ["react", "react-dom"],
    },
    test: {
        globals: true,
        environment: "jsdom",
        setupFiles: ["./test/setup.ts"],
        include: ["test/**/*.test.ts", "test/**/*.test.tsx"],
        clearMocks: true,
        coverage: {
            enabled: true,
            provider: "v8",
            include: ["src/**/*.ts", "src/**/*.tsx"],
            exclude: ["**/node_modules/**", "**/test/**"],
            reporter: ["text", "json", "html", "lcov"],
            thresholds: {
                "src/**": {
                    branches: 100,
                    functions: 100,
                    lines: 100,
                    statements: 100,
                },
            },
            reportsDirectory: "coverage",
        },
        reporters: ["default", "junit"],
        outputFile: {
            junit: "junit.xml",
        },
    },
});
