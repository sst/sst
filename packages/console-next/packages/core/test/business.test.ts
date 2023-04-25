import { expect, it } from "vitest";
import { Business } from "../src/business";
import { createId } from "@paralleldrive/cuid2";
import { Workspace } from "../src/workspace";

it("create business", async (ctx) => {
  const name = createId();
  const businessID = await Business.create({
    name,
  });

  const business = await Business.fromID(businessID);
  expect(business?.name).toBe(name);

  const workspaces = await Workspace.forBusiness(businessID);
  expect(workspaces).toHaveLength(1);
});
