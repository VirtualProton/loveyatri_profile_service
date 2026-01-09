import bcrypt from "bcrypt";
import { AdminRole, PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function seedSuperAdmin() {
  const email = process.env.SUPER_ADMIN_EMAIL;
  const password = process.env.SUPER_ADMIN_PASSWORD;

  if (!email || !password) {
    throw new Error("Missing SUPER_ADMIN credentials in env");
  }

  const existing = await prisma.admin.findUnique({
    where: { email }
  });

  if (existing) {
    console.log("✅ Super Admin already exists");
    return;
  }

  const passwordHash = await bcrypt.hash(password, 12);

  await prisma.admin.create({
    data: {
      email,
      passwordHash,
      role: AdminRole.SUPER_ADMIN,
      permissions: [], // ignored for SUPER_ADMIN
      isActive: true
    }
  });

  console.log("🚀 Super Admin seeded successfully");
}

seedSuperAdmin()
  .catch(err => {
    console.error("❌ Super Admin seed failed", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
