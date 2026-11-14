
import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";

import authRoutes from "./routes/auth.routes.js";
import propertyRoutes from "./routes/property.routes.js";
import categoryRoutes from "./routes/category.routes.js";
import landlordRoutes from "./routes/landlord.routes.js";
import rentalRoutes from "./routes/rental.routes.js";
import paymentRoutes from "./routes/payment.routes.js";
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

// Required for SSLCommerz form callbacks and IPN
app.use(express.urlencoded({
  extended: false,
}));

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
