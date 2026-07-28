import cors from "cors";
import express from "express";
import authRoutes from "./modules/auth/auth.routes.js";
import { notFound } from "./common/middlewares/notFound.js";
import { errorHandler } from "./common/middlewares/errorHandler.js";
import { sendSuccess } from "./common/utils/response.js";

export const app = express();

app.use(cors());

app.use(express.json());

app.get("/api/health", (_req, res) => {
  return sendSuccess(
    res,
    200,
    "RentNest API is running",
    {
      timestamp: new Date().toISOString()
    }
  );
});

app.use(
  "/api/auth",
  authRoutes
);

app.use(notFound);

app.use(errorHandler);