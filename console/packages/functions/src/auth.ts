import { AuthHandler, GithubAdapter, useSession } from "sst/node/future/auth";
import { Config } from "sst/node/config";
import { Octokit } from "@octokit/rest";
import { Account } from "@console/core/account";
import { Workspace } from "@console/core/workspace";
import { User } from "@console/core/user";
import { useTransaction } from "@console/core/util/transaction";
import { createId } from "@console/core/util/sql";
import { provideActor } from "@console/core/actor";

declare module "sst/node/future/auth" {
  export interface SessionTypes {
    account: {
      accountID: string;
      email: string;
    };
  }
}

export const handler = AuthHandler({
  providers: {
    github: GithubAdapter({
      mode: "oauth",
      scope: "read:user user:email",
      clientID: Config.GITHUB_CLIENT_ID,
      clientSecret: Config.GITHUB_CLIENT_SECRET,
    }),
  },
  async clients() {
    return {
      solid: "",
    };
  },
  onSuccess: async (input) => {
    let email: string | undefined;

    if (input.provider === "github") {
      const o = new Octokit({
        auth: input.tokenset.access_token,
      });
      const emails = await o.request("GET /user/emails");
      email = emails.data.find((x) => x.primary)?.email;
    }
    if (!email) throw new Error("No email found");

    let accountID = await Account.fromEmail(email).then((x) => x?.id);
    if (!accountID) {
      await useTransaction(async () => {
        accountID = await Account.create({
          email: email!,
        });

        const workspaceID = createId();
        await Workspace.create({
          slug: workspaceID,
          id: workspaceID,
        });

        provideActor({
          type: "system",
          properties: {
            workspaceID,
          },
        });

        await User.create({
          email: email!,
        });
      });
    }

    return {
      type: "account",
      properties: {
        accountID: accountID!,
        email: email!,
      },
    };
  },
  onError: async () => ({
    statusCode: 401,
  }),
});
