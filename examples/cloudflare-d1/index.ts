import { Resource } from "sst";

export default {
  async fetch(req: Request) {
    const result = await Resource.MyDatabase.prepare(
      "SELECT id FROM todo ORDER BY id DESC LIMIT 1",
    ).first();
    await Resource.MyDatabase.prepare("INSERT INTO todo (id) VALUES (?1)")
      .bind((result.id as number) + 1)
      .run();
    return new Response(result.id.toString());
  },
};
