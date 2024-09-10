import { Resource } from "sst";
import { PrismaClient } from '@prisma/client';

const globalForPrisma = global as unknown as { prisma: PrismaClient }

export const prisma = globalForPrisma.prisma ||
  new PrismaClient({
    datasources: {
      db: {
        url: `postgresql://${Resource.MyPostgres.username}:${Resource.MyPostgres.password}@${Resource.MyPostgres.host}:${Resource.MyPostgres.port}/${Resource.MyPostgres.database}?connection_limit=1`,
      },
    },
  });

// Create single client in `sst dev` 
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
