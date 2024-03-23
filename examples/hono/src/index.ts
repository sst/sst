import { Hono } from "hono";
import { streamHandle } from "hono/aws-lambda";
import { streamText } from "hono/streaming";

const app = new Hono();

const TEXT = "streaming from lambda hahahahahahahaha...bye";

app.get("/", async (c) => {
  return streamText(c, async (stream) => {
    for (let i = 0; i < TEXT.length; i++) {
      const letter = TEXT[i];
      const html = `${letter}`;
      stream.write(html);
      await new Promise((r) => setTimeout(r, 100));
    }
  });
});

export const handler = streamHandle(app);
