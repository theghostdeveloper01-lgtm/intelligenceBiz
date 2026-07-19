/** @type {import('next').NextConfig} */
const nextConfig = {
  // Minimal runtime image: .next/standalone bundles only the traced
  // dependencies, so the Docker image doesn't need the full node_modules.
  output: "standalone",
};

export default nextConfig;
