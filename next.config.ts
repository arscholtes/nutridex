import { readFileSync } from "node:fs";
import type { NextConfig } from "next";

// The disclaimer gate keys acceptance to this version: bumping it in package.json shows it again.
const { version } = JSON.parse(readFileSync("package.json", "utf8")) as { version: string };

const nextConfig: NextConfig = {
  env: { APP_VERSION: version },
};

export default nextConfig;
