
import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";

const app = express();

// Security middleware
app.use(helmet());

// Cross-origin configuration
app.use(cors());

// Parse JSON requests
app.use(express.json());

// Log incoming requests
app.use(morgan("dev"));

// Root route
app.get("/", (_req, res) => {
  res.status(200).json({
    success: true,
    message: "Welcome to RentNest API",
    data: null,
  });
});

// Health check route
app.get("/api/health", (_req, res) => {
  res.status(200).json({
    success: true,
    message: "RentNest API is healthy",
    data: {
      timestamp: new Date().toISOString(),
    },
  });
});

export default app;
