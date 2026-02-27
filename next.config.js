/** @type {import('next').NextConfig} */
const nextConfig = {

    // Skip ESLint during `next build` so Docker doesn't fail on lint warnings
    eslint: {
        ignoreDuringBuilds: true,
    },

    // Skip TypeScript type errors during build (we have no tsconfig but just in case)
    typescript: {
        ignoreBuildErrors: true,
    },
};

module.exports = nextConfig;
