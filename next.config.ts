import { readFileSync } from "node:fs";
import type { NextConfig } from "next";

// The disclaimer gate keys acceptance to this version: bumping it in package.json shows it again.
const { version } = JSON.parse(readFileSync("package.json", "utf8")) as { version: string };

const nextConfig: NextConfig = {
  env: { APP_VERSION: version },
  // Pages read creature drawings from disk to cut their silhouettes; a hosted server function only
  // holds the files traced into it, and nothing imports these.
  outputFileTracingIncludes: { "/**": ["./public/art/ingredients/**"] },
};

export default nextConfig;
