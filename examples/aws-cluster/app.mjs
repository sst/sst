import { Resource } from "sst";
import express from "express";
const app = express();
const port = 80;

app.get("/", (req, res) => {
  res.send(
    [
      "<h1>Express app v2</h1>" +
        `<pre>Resource.StripeKey: ${Resource.StripeKey.value}</pre>`,
    ].join("")
  );
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
