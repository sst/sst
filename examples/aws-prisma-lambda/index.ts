import { prisma } from "./prisma";

async function createUser(name: string, email: string) {
  return prisma.user.create({
    data: { name, email },
  });
}

export async function handler() {
  const user = await createUser("Alice", `alice-${crypto.randomUUID()}@example.com`);
  return {
    statusCode: 201,
    body: JSON.stringify({ user }),
  };
}
