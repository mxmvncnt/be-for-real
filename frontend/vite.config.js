import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
export default defineConfig({
    plugins: [
        react(),
        VitePWA({
            registerType: 'autoUpdate',
            includeAssets: ['favicon.svg', 'apple-touch-icon.svg', 'masked-icon.svg'],
            manifest: {
                name: 'Be For Real',
                short_name: 'BFRL',
                description: 'A social media platform for sharing and discovering real-life moments through short videos.',
                theme_color: '#f5efe6',
                background_color: '#f5efe6',
                display: 'standalone',
                start_url: '/',
                icons: [
                    {
                        src: '/pwa-192x192.png',
                        sizes: '192x192',
                        type: 'image/png',
                    },
                    {
                        src: '/pwa-512x512.png',
                        sizes: '512x512',
                        type: 'image/png',
                    },
                    {
                        src: '/maskable-icon-512x512.png',
                        sizes: '512x512',
                        type: 'image/png',
                        purpose: 'maskable',
                    },
                ],
            },
            devOptions: {
                enabled: false,
            },
        }),
    ],
    server: {
        port: 5173,
        proxy: {
            '/api': {
                target: 'http://localhost:3000',
                changeOrigin: true,
            },
            '/auth': {
                target: 'http://localhost:3000',
                changeOrigin: true,
            },
            '/user': {
                target: 'http://localhost:3000',
                changeOrigin: true,
            },
            '/videos': {
                target: 'http://localhost:3000',
                changeOrigin: true,
            },
            '/friend': {
                target: 'http://localhost:3000',
                changeOrigin: true,
            },
        },
    },
});
