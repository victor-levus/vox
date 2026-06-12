import { PrismaClient } from '@prisma/client';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';

const url = new URL(process.env.DATABASE_URL!);
const adapter = new PrismaMariaDb({
  host: url.hostname,
  user: url.username,
  password: url.password,
  database: url.pathname.slice(1),
  port: Number(url.port) || 3306,
  // MySQL 8 uses caching_sha2_password by default; the driver needs to fetch
  // the RSA public key on first auth if the client doesn't have it cached.
  allowPublicKeyRetrieval: true,
});

const prisma = new PrismaClient({ adapter });
export default prisma;
