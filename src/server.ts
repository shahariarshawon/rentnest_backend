import { app } from "./app.js";
import { env } from "./config/env.js";
import { prisma } from "./config/prisma.js";

const server = app.listen(
  env.PORT,
  () => {
    console.log(
      `RentNest API is running on http://localhost:${env.PORT}`
    );
  }
);

async function shutdown() {
  console.log("Shutting down server...");

  await prisma.$disconnect();

  server.close(() => {
    process.exit(0);
  });
}

process.on(
  "SIGINT",
  shutdown
);

process.on(
  "SIGTERM",
  shutdown
);