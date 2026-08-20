import { PrismaClient } from '@prisma/client';

let prisma = null;

export function initializeDb() {
  if (prisma) return prisma;
  prisma = new PrismaClient();
  return prisma;
}

export function getDb() {
  if (!prisma) throw new Error('Database not initialized. Call initializeDb() first.');
  return prisma;
}

export async function closeDb() {
  if (prisma) {
    try {
      await prisma.$disconnect();
    } catch (err) {
      console.warn('Error while disconnecting Prisma:', err?.message || err);
    } finally {
      prisma = null;
    }
  }
}
