import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import type { RequestHandler } from "express";
import authRoutes from "./routes/auth.routes.js";
import propertyRoutes from "./routes/property.routes.js";
import categoryRoutes from "./routes/category.routes.js";
import landlordRoutes from "./routes/landlord.routes.js";
import rentalRoutes from "./routes/rental.routes.js";
import paymentRoutes from "./routes/payment.routes.js";
import reviewRoutes from "./routes/review.routes.js";
import adminRoutes from "./routes/admin.routes.js";
import swaggerUi from "swagger-ui-express";
import { readFileSync } from "node:fs";
import { parse } from "yaml";
import {
  notFoundHandler,
  errorHandler,
} from "./middlewares/error.middleware.js";

const app = express();
// ===========================
// SWAGGER OPENAPI DOCUMENTATION
// ===========================

const openApiDocument = parse(
  readFileSync(new URL("../docs/openapi.yaml", import.meta.url), "utf-8"),
);
// Security middleware
app.use(helmet());

// CORS
app.use(cors());

// JSON parser
app.use(express.json());

// Required for SSLCommerz form callbacks and IPN
app.use(
  express.urlencoded({
    extended: false,
  }),
);

// Request logger
app.use(morgan("dev"));

// ===========================
// ROOT ROUTE
// ===========================

app.get("/", (_req, res) => {
  res.status(200).json({
    success: true,
    message: "Welcome to RentNest API",
    data: null,
  });
});

// ===========================
// HEALTH CHECK
// ===========================

app.get("/api/health", (_req, res) => {
  res.status(200).json({
    success: true,
    message: "RentNest API is healthy",
    data: {
      timestamp: new Date().toISOString(),
    },
  });
});

// ===========================
// SWAGGER DOCUMENTATION ROUTE
// ===========================

// ===========================
// SWAGGER DOCUMENTATION ROUTE
// ===========================

const swaggerDocsMiddleware: RequestHandler = (_req, res, next) => {
  res.removeHeader("Content-Security-Policy");
  next();
};

app.use(
  "/api/docs",
  swaggerDocsMiddleware,
  swaggerUi.serve,
  swaggerUi.setup(openApiDocument, {
    swaggerOptions: {
      persistAuthorization: true,
    },
  }),
);
// ===========================
// AUTHENTICATION
// ===========================

app.use("/api/auth", authRoutes);

// ===========================
// PUBLIC APIS
// ===========================

app.use("/api/properties", propertyRoutes);

app.use("/api/categories", categoryRoutes);

// Payment APIs
app.use("/api/payments", paymentRoutes);
// Review APIs
app.use("/api/reviews", reviewRoutes);

// Admin APIs
app.use("/api/admin", adminRoutes);

// ===========================
// TENANT APIS
// ===========================

app.use("/api/rentals", rentalRoutes);

// ===========================
// LANDLORD APIS
// ===========================

app.use("/api/landlord", landlordRoutes);

// ===========================
// ERROR HANDLING
// ===========================

app.use(notFoundHandler);

app.use(errorHandler);

export default app;
