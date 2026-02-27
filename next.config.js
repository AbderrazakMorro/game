/** @type {import('next').NextConfig} */
const nextConfig = {

    // Skip TypeScript type errors during build (we have no tsconfig but just in case)
    typescript: {
        ignoreBuildErrors: true,
    },
};

module.exports = nextConfig;
