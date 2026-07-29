import cors from "cors";
import express from "express";
import { errorHandler } from "./common/middlewares/errorHandler.js";
import { notFound } from "./common/middlewares/notFound.js";
import { sendSuccess } from "./common/utils/response.js";
import { setupSwagger } from "./config/swagger.js";
import adminRoutes from "./modules/admin/admin.routes.js";
import authRoutes from "./modules/auth/auth.routes.js";
import categoryRoutes from "./modules/categories/category.routes.js";
import paymentRoutes, {
  stripeWebhookRouter,
} from "./modules/payments/payment.routes.js";
import {
  landlordPropertyRouter,
  publicPropertyRouter,
} from "./modules/properties/property.routes.js";
import {
  landlordRentalRouter,
  tenantRentalRouter,
} from "./modules/rentals/rental.routes.js";
import reviewRoutes from "./modules/reviews/review.routes.js";
import userRoutes from "./modules/users/user.routes.js";

export const app = express();

app.use(cors());

// Stripe requires the original raw body for webhook signature verification.
app.use("/api/payments/webhook", stripeWebhookRouter);

app.use(express.json({ limit: "1mb" }));

// Setup Swagger API Documentation
setupSwagger(app);

// root route
app.get("/", (_req, res) => {
  return res.status(200).json({
    success: true,
    message: "Welcome to RentNest API",
    data: {
      health: "/api/health",
      documentation: "/api/docs",
    },
  });
});

// Health check
app.get("/api/health", (_req, res) => {
  return sendSuccess(res, 200, "RentNest API is running", {
    timestamp: new Date().toISOString(),
  });
});

// Authentication routes
app.use("/api/auth", authRoutes);

// User profile routes
app.use("/api/users", userRoutes);

// Category routes
app.use("/api/categories", categoryRoutes);

// Property routes
app.use("/api/properties", publicPropertyRouter);
app.use("/api/landlord/properties", landlordPropertyRouter);

// Rental routes
app.use("/api/rentals", tenantRentalRouter);
app.use("/api/landlord/requests", landlordRentalRouter);

// Payment routes
app.use("/api/payments", paymentRoutes);

// Review routes
app.use("/api/reviews", reviewRoutes);

// Admin routes
app.use("/api/admin", adminRoutes);

// 404 handler
app.use(notFound);

// Error handler middleware
app.use(errorHandler);

export default app;
