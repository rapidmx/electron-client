import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// The renderer is a plain Vite SPA (not @rapidrest/react - there's no SSR here, this process never talks
// to an app server directly, only to the RapidMX API - see src/main/index.ts's own doc comment for the
// login/window-handoff flow). `resolve.dedupe` matters here for the exact same reason it does in
// rapidmx/server and rapidmx/web-client: @rapidmx/web-client and @rapidmx/react-shared are both
// link:-ed sibling packages with their own independent devDependency copies of React, which would
// otherwise resolve as separate instances and break every hook with "Invalid hook call".
export default defineConfig({
    root: "src/renderer",
    base: "./",
    plugins: [react(), tailwindcss()],
    resolve: {
        dedupe: ["react", "react-dom"],
    },
    server: {
        port: 5173,
        strictPort: true,
    },
    build: {
        outDir: "../../dist/renderer",
        emptyOutDir: true,
    },
});
