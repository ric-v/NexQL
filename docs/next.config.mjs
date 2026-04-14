import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  turbopack: {
    // Monorepo: avoid picking parent PgStudio/package-lock.json as workspace root
    root: __dirname,
  },
};

export default nextConfig;
