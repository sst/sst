import { describe, it } from "vitest";
import { AuthHandler } from "../../src";
import { GoogleAdapter } from "../../src/auth/google";

describe("handler", () => {
  const handler = AuthHandler({
    providers: {
      google: {
        adapter: GoogleAdapter,
        config: {
          clientID: "google-client-id",
          onSuccess: async claims => {
            return {
              statusCode: 200,
              body: JSON.stringify(claims, null, 4)
            };
          }
        }
      }
    }
  });
  it("google", async () => {});
});
