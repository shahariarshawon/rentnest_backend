
import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";

import authRoutes from "./routes/auth.routes.js";

import {
  notFoundHandler,
  errorHandler,
} from "./middlewares/error.middleware.js";

const app = express();

// Security middleware
app.use(helmet());

// CORS
app.use(cors());

// JSON body parser
app.use(express.json());

// Request logging
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

// Authentication routes
app.use("/api/auth", authRoutes);

// Handle unknown routes
app.use(notFoundHandler);

// Global error handler (must be last)
app.use(errorHandler);

export default app;
