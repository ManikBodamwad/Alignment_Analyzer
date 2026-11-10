import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const esbuildCandidates = [
  "/opt/homebrew/lib/node_modules/vercel/node_modules/.bin/esbuild",
  path.join(__dirname, "node_modules", ".bin", "esbuild"),
  "esbuild",
];

const esbuildBin = esbuildCandidates.find((p) => p === "esbuild" || existsSync(p));

execFileSync(
  esbuildBin,
  [
    path.join(__dirname, "src", "main.tsx"),
    "--bundle",
    "--outfile=" + path.join(__dirname, "public", "bundle.js"),
    "--format=iife",
    "--target=es2020",
    "--jsx-factory=h",
    "--jsx-fragment=Fragment",
  ],
  { stdio: "inherit" }
);
console.log("Frontend TypeScript bundle compiled successfully -> frontend/public/bundle.js");

