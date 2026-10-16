import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  async headers() {
    return [
      {
        // A model file never changes under the same name (a new model gets a new
        // name, see CAR_URL in carModel.ts), so browsers can cache it for a week.
        source: "/models/:file*",
        headers: [{ key: "Cache-Control", value: "public, max-age=604800, stale-while-revalidate=86400" }],
      },
    ];
  },
};

export default nextConfig;
