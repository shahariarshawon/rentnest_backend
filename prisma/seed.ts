import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaPg } from "@prisma/adapter-pg";
import {
  PrismaClient,
  Role
} from "../src/generated/prisma/client.js";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is missing");
}

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

async function main() {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  const name = process.env.ADMIN_NAME ?? "RentNest Admin";

  if (!email || !password) {
    throw new Error("ADMIN_EMAIL and ADMIN_PASSWORD are required");
  }

  const passwordHash = await bcrypt.hash(password, 12);

  await prisma.user.upsert({
    where: { email },
    update: {
      name,
      passwordHash,
      role: Role.ADMIN
    },
    create: {
      name,
      email,
      passwordHash,
      role: Role.ADMIN
    }
  });

  const categoryNames = ["Apartment", "House", "Studio", "Condo"];

  for (const categoryName of categoryNames) {
    const slug = categoryName.toLowerCase();

    await prisma.category.upsert({
      where: { slug },
      update: { name: categoryName },
      create: {
        name: categoryName,
        slug
      }
    });
  }

  console.log("Admin and categories seeded successfully");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });