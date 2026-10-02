import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import sampleData from "./sample-data";


async function main() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter });

  // Clear existing data
  await prisma.product.deleteMany();

  // Seed products
  await prisma.product.createMany({
    data: sampleData.products,
  });

  console.log("Database seeded successfully!");
}

main();