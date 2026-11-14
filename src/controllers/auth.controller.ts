
import type { RequestHandler } from "express";

import bcrypt from "bcryptjs";

import { prisma } from "../lib/prisma.js";
import { AppError } from "../utils/appError.js";
import { generateAccessToken } from "../utils/jwt.js";

import type {
  RegisterInput,
  LoginInput,
  UpdateProfileInput,
} from "../validations/auth.validation.js";

// ===========================
// REGISTER USER
// ===========================

export const register: RequestHandler = async (
  req,
  res,
  next
) => {
  try {
    const {
      name,
      email,
      password,
      phone,
      role,
    } = req.body as RegisterInput;

    // Check if email already exists
    const existingUser = await prisma.user.findUnique({
      where: {
        email,
      },
      select: {
        id: true,
      },
    });

    if (existingUser) {
      throw new AppError(
        "An account with this email already exists",
        409
      );
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 12);

    // Create user
    const user = await prisma.user.create({
      data: {
        name,
        email,
        passwordHash,
        phone: phone ?? null,
        role,
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        status: true,
        createdAt: true,
      },
    });

    // Generate JWT
    const accessToken = generateAccessToken(user.id);

    res.status(201).json({
      success: true,
      message: "Registration successful",
      data: {
        user,
        accessToken,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ===========================
// LOGIN USER
// ===========================

export const login: RequestHandler = async (
  req,
  res,
  next
) => {
  try {
    const {
      email,
      password,
    } = req.body as LoginInput;

    // Find user
    const user = await prisma.user.findUnique({
      where: {
        email,
      },
    });

    if (!user) {
      throw new AppError(
        "Invalid email or password",
        401
      );
    }

    // Compare password
    const isPasswordValid = await bcrypt.compare(
      password,
      user.passwordHash
    );

    if (!isPasswordValid) {
      throw new AppError(
        "Invalid email or password",
        401
      );
    }

    // Check account status
    if (user.status === "BANNED") {
      throw new AppError(
        "Your account has been banned",
        403
      );
    }

    // Generate access token
    const accessToken = generateAccessToken(user.id);

    // Never return passwordHash
    const safeUser = {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      status: user.status,
      createdAt: user.createdAt,
    };

    res.status(200).json({
      success: true,
      message: "Login successful",
      data: {
        user: safeUser,
        accessToken,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ===========================
// GET CURRENT USER
// ===========================

export const getMe: RequestHandler = (
  req,
  res,
  next
) => {
  if (!req.user) {
    return next(
      new AppError("Authentication required", 401)
    );
  }

  res.status(200).json({
    success: true,
    message: "User profile retrieved successfully",
    data: req.user,
  });
};

// ===========================
// UPDATE CURRENT USER PROFILE
// ===========================

export const updateMe: RequestHandler = async (req, res, next) => {
  try {
    if (!req.user) {
      throw new AppError("Authentication required", 401);
    }

    const { name, phone } = req.body as UpdateProfileInput;

    if (!name && phone === undefined) {
      throw new AppError(
        "At least one field (name or phone) must be provided",
        400,
      );
    }

    if (phone) {
      const existingPhone = await prisma.user.findFirst({
        where: {
          phone,
          id: { not: req.user.id },
        },
      });

      if (existingPhone) {
        throw new AppError(
          "This phone number is already registered to another account",
          409,
        );
      }
    }

    const updatedUser = await prisma.user.update({
      where: { id: req.user.id },
      data: {
        ...(name ? { name } : {}),
        ...(phone !== undefined ? { phone } : {}),
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    res.status(200).json({
      success: true,
      message: "User profile updated successfully",
      data: updatedUser,
    });
  } catch (error) {
    next(error);
  }
};
