import { defineConfig } from "vite";
import glsl from "vite-plugin-glsl";
import { cloudflare } from "@cloudflare/vite-plugin";

export default defineConfig({
    plugins: [glsl(), cloudflare()],
    build: {
        rollupOptions: {
            output: {
                manualChunks: {
                    vendor: ['gsap', 'three'],
                    animations: ['@lottiefiles/dotlottie-web']
                }
            }
        },
        target: 'es2020',
        minify: 'esbuild',
        sourcemap: false
    },
    optimizeDeps: {
        include: ['gsap', 'three', '@lottiefiles/dotlottie-web']
    }
});
