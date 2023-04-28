import { expect, it } from "vitest";
import { createId } from "@paralleldrive/cuid2";
import { Account } from "../src/account";

it("create account", async (ctx) => {
  const email = createId() + "@example.com";
  const accountID = createId();
  const account = await Account.create({
    email,
    id: accountID,
  });

  expect(await Account.fromID(accountID).then((x) => x?.id)).toEqual(accountID);
  expect(await Account.fromEmail(email).then((x) => x?.email)).toEqual(email);
});
