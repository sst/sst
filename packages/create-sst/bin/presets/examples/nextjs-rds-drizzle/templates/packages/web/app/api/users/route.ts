import { db, users } from "@/drizzle";

export async function GET() {
  const usersList = await db.select().from(users);
  return Response.json({ usersList })
}