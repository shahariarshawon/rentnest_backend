
import "dotenv/config";

import bcrypt from "bcryptjs";
import { PrismaNeon } from "@prisma/adapter-neon";
import { PrismaClient } from "../src/generated/prisma/client.js";

// Use the same direct database connection as migrations
const connectionString = process.env.DIRECT_URL;

if (!connectionString) {
  throw new Error("DIRECT_URL is not configured");
}

const adapter = new PrismaNeon({
  connectionString,
});

const prisma = new PrismaClient({
  adapter,
});

const categories = [
  {
    name: "Apartment",
    slug: "apartment",
    description: "Residential apartment properties",
  },
  {
    name: "House",
    slug: "house",
    description: "Independent residential houses",
  },
  {
    name: "Studio",
    slug: "studio",
    description: "Studio apartment properties",
  },
  {
    name: "Room",
    slug: "room",
    description: "Individual rental rooms",
  },
  {
    name: "Villa",
    slug: "villa",
    description: "Luxury villa properties",
  },
];

async function main() {
  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPassword = process.env.ADMIN_PASSWORD;
  const adminName = process.env.ADMIN_NAME ?? "RentNest Admin";

  if (!adminEmail || !adminPassword) {
    throw new Error(
      "ADMIN_EMAIL and ADMIN_PASSWORD must be configured"
    );
  }

  await prisma.$connect();

  // Hash admin password
  const passwordHash = await bcrypt.hash(adminPassword, 12);

  // Create or update admin
  const admin = await prisma.user.upsert({
    where: {
      email: adminEmail,
    },
    update: {
      name: adminName,
      passwordHash,
      role: "ADMIN",
      status: "ACTIVE",
    },
    create: {
      name: adminName,
      email: adminEmail,
      passwordHash,
      role: "ADMIN",
      status: "ACTIVE",
    },
  });

  console.log("Admin account created:", admin.email);

  // Seed categories
  for (const category of categories) {
    await prisma.category.upsert({
      where: {
        slug: category.slug,
      },
      update: {
        name: category.name,
        description: category.description,
      },
      create: category,
    });
  }

  console.log("Categories seeded successfully!");
}

main()
  .catch((error) => {
    console.error("Seeding failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
