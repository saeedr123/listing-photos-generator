const path = require("node:path");

// The server reads repository files at run time (see src/lib/repo-root.ts).
// On Vercel only traced files are deployed, and reads built from
// repoRoot() cannot be traced automatically, so they are listed here.
// The tracing root is the repository root, so files outside apps/web can
// be included.
const runtimeFiles = [
  "../../config/**/*",
  "../../packages/export/src/etsy-pack.json",
  "../../packages/mockup-engine/assets/**/*",
  "../../packages/mockup-engine/registry/**/*",
  "../../packages/mockup-engine/mockups/**/*",
  "../../packages/template-engine/templates/**/*",
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  // LPG_STANDALONE=true builds a folder holding only the traced files. It is
  // used to check, without Vercel, that the traced files are enough to run.
  output: process.env.LPG_STANDALONE === "true" ? "standalone" : undefined,
  transpilePackages: ["@listing-photos-generator/shared"],
  experimental: {
    outputFileTracingRoot: path.join(__dirname, "..", ".."),
    outputFileTracingIncludes: {
      "/**/*": runtimeFiles,
    },
    // sharp and the Prisma client load native code and stay outside the bundle.
    serverComponentsExternalPackages: ["sharp", "@prisma/client"],
  },
};

module.exports = nextConfig;
