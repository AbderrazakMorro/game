/** @type {import('next').NextConfig} */
const withPWA = require('next-pwa')({
    dest: 'public',
    register: true,
    skipWaiting: true,
    disable: process.env.NODE_ENV === 'development'
})

const nextConfig = {
    // Skip TypeScript type errors during build
    typescript: {
        ignoreBuildErrors: true,
    },
    // Allow QR code images from external API
    images: {
        remotePatterns: [
            { protocol: 'https', hostname: 'api.qrserver.com' },
        ],
    },
    // next-pwa uses webpack, ignoring turbopack warning
    turbopack: {}
}

module.exports = withPWA(nextConfig)
