import type { Express } from "express";
import swaggerUi from "swagger-ui-express";
import YAML from "yamljs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const swaggerDocumentPath = path.join(__dirname, "../doc/openapi.yaml");

export function setupSwagger(app: Express) {
  try {
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
