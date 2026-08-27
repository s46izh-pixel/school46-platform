import { cp, mkdir, rm, rename } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const openNextDir = path.join(root, ".open-next");
const distDir = path.join(root, "dist");
const serverDir = path.join(distDir, "server");

await rm(distDir, { recursive: true, force: true });
await mkdir(serverDir, { recursive: true });
await cp(openNextDir, serverDir, { recursive: true });
await rename(path.join(serverDir, "worker.js"), path.join(serverDir, "index.js"));
await cp(path.join(openNextDir, "assets"), path.join(distDir, "assets"), { recursive: true });
