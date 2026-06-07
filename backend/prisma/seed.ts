import { PrismaClient } from '@prisma/client';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import bcrypt from 'bcryptjs';

const url = new URL(process.env.DATABASE_URL!);
const adapter = new PrismaMariaDb({
  host: url.hostname,
  user: url.username,
  password: url.password,
  database: url.pathname.slice(1),
  port: Number(url.port) || 3306,
});

const prisma = new PrismaClient({ adapter });

async function main() {
  const hashedPassword = await bcrypt.hash('password123', 10);

  const alice = await prisma.user.upsert({
    where: { email: 'alice@example.com' },
    update: {},
    create: {
      name: 'Alice',
      email: 'alice@example.com',
      password: hashedPassword,
    },
  });

  await prisma.user.upsert({
    where: { email: 'bob@example.com' },
    update: {},
    create: {
      name: 'Bob',
      email: 'bob@example.com',
      password: hashedPassword,
    },
  });

  await prisma.room.upsert({
    where: { code: 'TESTROOM01' },
    update: {},
    create: {
      code: 'TESTROOM01',
      name: 'Test Meeting Room',
      hostId: alice.id,
      isActive: true,
    },
  });

  console.log('Seed complete — Alice, Bob, and a test room created.');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
