import express from "express";
import { increment } from "./common.mjs";

const PORT = 80;

const app = express();

app.get("/", async (req, res) => {
  res.send(
    JSON.stringify({
      counter: await increment(),
    })
  );
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
