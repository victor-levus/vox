// Full implementation in Step 3 after `prisma generate` is run.
//
// Prisma 7 pattern for MySQL (no `url` in schema.prisma):
//
//   import { PrismaClient } from '@prisma/client'
//   import { PrismaMariaDb } from '@prisma/adapter-mariadb'
//
//   const url = new URL(process.env.DATABASE_URL!)
//   const adapter = new PrismaMariaDb({
//     host: url.hostname,
//     user: url.username,
//     password: url.password,
//     database: url.pathname.slice(1),
//     port: Number(url.port) || 3306,
//   })
//
//   const prisma = new PrismaClient({ adapter })
//   export default prisma

export {};
