const { runStartCommand } = require("../helpers");

test("base", async () => {
  const result = await runStartCommand(__dirname);

  expect(result).toContain("my-url");
});
