import "dotenv/config";

import bcrypt from "bcryptjs";
import { PrismaNeon } from "@prisma/adapter-neon";
import { PrismaClient } from "../src/generated/prisma/client.js";

// Use direct database connection for migrations and seeding
const connectionString = process.env.DIRECT_URL ?? process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DIRECT_URL or DATABASE_URL must be configured");
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
  const adminEmail = process.env.ADMIN_EMAIL ?? "admin@rentnest.com";
  const adminPassword = process.env.ADMIN_PASSWORD ?? "15025";
  const adminName = process.env.ADMIN_NAME ?? "RentNest Admin";

  await prisma.$connect();

  // 1. Seed Administrator
  const adminPasswordHash = await bcrypt.hash(adminPassword, 12);
  const admin = await prisma.user.upsert({
    where: {
      email: adminEmail,
    },
    update: {
      name: adminName,
      passwordHash: adminPasswordHash,
      role: "ADMIN",
      status: "ACTIVE",
    },
    create: {
      name: adminName,
      email: adminEmail,
      passwordHash: adminPasswordHash,
      role: "ADMIN",
      status: "ACTIVE",
    },
  });
  console.log("Admin account seeded:", admin.email);

  // 2. Seed Tenant Test Account
  const tenantEmail = "tenant@example.com";
  const tenantPasswordHash = await bcrypt.hash("TenantPass123!", 12);
  const tenant = await prisma.user.upsert({
    where: {
      email: tenantEmail,
    },
    update: {
      name: "Tenant One",
      role: "TENANT",
      status: "ACTIVE",
    },
    create: {
      name: "Tenant One",
      email: tenantEmail,
      passwordHash: tenantPasswordHash,
      role: "TENANT",
      status: "ACTIVE",
    },
  });
  console.log("Tenant account seeded:", tenant.email);

  // 3. Seed Landlord Test Account
  const landlordEmail = "landlord@example.com";
  const landlordPasswordHash = await bcrypt.hash("LandlordPass123!", 12);
  const landlord = await prisma.user.upsert({
    where: {
      email: landlordEmail,
    },
    update: {
      name: "Landlord One",
      role: "LANDLORD",
      status: "ACTIVE",
    },
    create: {
      name: "Landlord One",
      email: landlordEmail,
      passwordHash: landlordPasswordHash,
      role: "LANDLORD",
      status: "ACTIVE",
    },
  });
  console.log("Landlord account seeded:", landlord.email);

  // 4. Seed Categories
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
