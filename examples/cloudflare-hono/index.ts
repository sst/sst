import { Hono } from "hono";
import { streamText } from "hono/streaming";

const app = new Hono();

const TEXT = "streaming woooo...bye";

app.get("/", async (c) => {
  return streamText(c, async (stream) => {
    console.log("a", "b", "c", { d: "e" }, "foo\nlol");
    console.log("wow");
    for (let i = 0; i < TEXT.length; i++) {
      const letter = TEXT[i];
      const html = `${letter}`;
      stream.write(html);
      await new Promise((r) => setTimeout(r, 10));
    }
  });
});

export default app;
