import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'pwa-192x192.png', 'pwa-512x512.png'],
      manifest: {
        name: 'Home Inventory',
        short_name: 'Home Inventory',
        description: 'Home grocery and medicine inventory app with OCR capabilities',
        theme_color: '#ffffff',
        background_color: '#ffffff',
        display: 'standalone',
        start_url: '/',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ],
        shortcuts: [
          {
            name: "Scan Medicine",
            short_name: "Scan Meds",
            description: "Quickly scan a new medicine label or barcode",
            url: "/?action=scan_medicine",
            icons: [{ src: "/pwa-192x192.png", sizes: "192x192" }]
          },
          {
            name: "Expiring Soon",
            short_name: "Expiring",
            description: "View items that are expiring soon",
            url: "/?action=view_expiring",
            icons: [{ src: "/pwa-192x192.png", sizes: "192x192" }]
          },
          {
            name: "Pharmacy",
            short_name: "Pharmacy",
            description: "Manage your medicines",
            url: "/?action=view_medicines",
            icons: [{ src: "/pwa-192x192.png", sizes: "192x192" }]
          }
        ]
      }
    })
  ],
})
