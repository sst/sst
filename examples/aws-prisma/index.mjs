import express from "express";
import { PrismaClient } from '@prisma/client';

const PORT = 80;

const app = express();
const prisma = new PrismaClient();

app.get("/", async (_req, res) => {
  const user = await prisma.user.create({
    data: {
      name: "Alice",
      email: `alice-${crypto.randomUUID()}@example.com`
    },
  });
  res.send(JSON.stringify(user));
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
