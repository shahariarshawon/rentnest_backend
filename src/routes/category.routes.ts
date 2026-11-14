
import { Router } from "express";

import {
  getCategories,
} from "../controllers/category.controller.js";

const router = Router();

// Get all categories
router.get("/", getCategories);

export default router;
