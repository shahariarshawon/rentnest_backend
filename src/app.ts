
import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";

import authRoutes from "./routes/auth.routes.js";
import propertyRoutes from "./routes/property.routes.js";
import categoryRoutes from "./routes/category.routes.js";
import landlordRoutes from "./routes/landlord.routes.js";

import {
  notFoundHandler,
  errorHandler,
} from "./middlewares/error.middleware.js";

const app = express();

// Security middleware
app.use(helmet());

// CORS
app.use(cors());

// JSON parser
app.use(express.json());

// Request logger
app.use(morgan("dev"));

// Root route
app.get("/", (_req, res) => {
  res.status(200).json({
    success: true,
    message: "Welcome to RentNest API",
    data: null,
  });
});

// Health check
app.get("/api/health", (_req, res) => {
  res.status(200).json({
    success: true,
    message: "RentNest API is healthy",
    data: {
      timestamp: new Date().toISOString(),
    },
  });
});

// Authentication
app.use("/api/auth", authRoutes);

// Public property APIs
app.use("/api/properties", propertyRoutes);

// Public category APIs
app.use("/api/categories", categoryRoutes);

// Landlord APIs
app.use("/api/landlord", landlordRoutes);

// 404 handler
app.use(notFoundHandler);

// Global error handler (must be last)
app.use(errorHandler);

export default app;
