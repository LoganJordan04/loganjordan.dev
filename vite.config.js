import { defineConfig } from "vite";
import glsl from "vite-plugin-glsl";
import { cloudflare } from "@cloudflare/vite-plugin";

export default defineConfig({
    plugins: [glsl(), cloudflare()],
});
