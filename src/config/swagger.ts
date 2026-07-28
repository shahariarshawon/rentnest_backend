import type { Express } from "express";
import swaggerUi from "swagger-ui-express";
import YAML from "yamljs";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function setupSwagger(app: Express) {
  try {
    const cwdPath = path.join(process.cwd(), "src/doc/openapi.yaml");
    const distPath = path.join(__dirname, "../doc/openapi.yaml");
    const swaggerDocumentPath = fs.existsSync(cwdPath) ? cwdPath : distPath;

    const swaggerDocument = YAML.load(swaggerDocumentPath);
    app.use("/api/docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument));
    app.get("/api/docs.json", (_req, res) => {
      res.setHeader("Content-Type", "application/json");
      res.send(swaggerDocument);
    });
  } catch (error) {
    console.error("Failed to load Swagger OpenAPI document:", error);
  }
}
