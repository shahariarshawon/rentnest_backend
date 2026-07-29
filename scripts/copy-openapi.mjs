import { copyFile, mkdir } from "node:fs/promises";

await mkdir("dist/doc", { recursive: true });
await copyFile("src/doc/openapi.yaml", "dist/doc/openapi.yaml");
