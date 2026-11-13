import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");

const esbuildCandidates = [
  "/opt/homebrew/lib/node_modules/vercel/node_modules/.bin/esbuild",
  path.join(__dirname, "node_modules", ".bin", "esbuild"),
  "esbuild",
];

const esbuildBin = esbuildCandidates.find((p) => p === "esbuild" || existsSync(p));
const bundleOutPath = path.join(__dirname, "public", "bundle.js");
const indexHtmlPath = path.join(__dirname, "public", "index.html");

execFileSync(
  esbuildBin,
  [
    path.join(__dirname, "src", "main.tsx"),
    "--bundle",
    "--outfile=" + bundleOutPath,
    "--format=iife",
    "--target=es2020",
    "--jsx-factory=h",
    "--jsx-fragment=Fragment",
  ],
  { stdio: "inherit" }
);

// Also mirror into root /public for Vercel static CDN and /backend/static_assets.py for serverless Python fallback
const indexHtml = readFileSync(indexHtmlPath, "utf-8");
const bundleJs = readFileSync(bundleOutPath, "utf-8");

const rootPublicDir = path.join(rootDir, "public");
const rootPublicStaticDir = path.join(rootPublicDir, "static");
mkdirSync(rootPublicStaticDir, { recursive: true });
writeFileSync(path.join(rootPublicDir, "index.html"), indexHtml, "utf-8");
writeFileSync(path.join(rootPublicDir, "bundle.js"), bundleJs, "utf-8");
writeFileSync(path.join(rootPublicStaticDir, "bundle.js"), bundleJs, "utf-8");

const staticAssetsPyPath = path.join(rootDir, "backend", "static_assets.py");
const pyContent = `"""Auto-generated embedded frontend assets for serverless environments (Vercel / Lambda)."""\n\nINDEX_HTML = ${JSON.stringify(indexHtml)}\nBUNDLE_JS = ${JSON.stringify(bundleJs)}\n`;
writeFileSync(staticAssetsPyPath, pyContent, "utf-8");

console.log("Frontend bundle compiled -> frontend/public/bundle.js, public/, and backend/static_assets.py");
