/** @type {import('next').NextConfig} */
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
};

module.exports = nextConfig;
