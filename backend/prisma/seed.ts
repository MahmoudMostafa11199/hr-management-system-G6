import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient, Role } from '../src/generated/prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

async function main() {
  const hashedPassword = await bcrypt.hash('M7moud_111', 10);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@hr.com' },
    update: {},
    create: {
      email: 'admin@hr.com',
      password: hashedPassword,
      role: Role.ADMIN,
      isActive: true,
    },
  });

  console.log('✅ Admin user created:', admin.email);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
