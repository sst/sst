import { useSession } from "sst/node/future/auth";
import { assertActor, provideActor } from "@console/core/actor";
import { useHeader } from "sst/node/api";
import { User } from "@console/core/user";

export async function useApiAuth() {
  const session = useSession();
  provideActor(session);

  const workspaceID = useHeader("x-sst-workspace");
  if (workspaceID) {
    console.log("auth workspace", workspaceID);
    const account = assertActor("account");
    provideActor({
      type: "system",
      properties: {
        workspaceID,
      },
    });
    const user = await User.fromEmail(account.properties.email);
    if (!user)
      throw new Error(
        `User not found for email ${account.properties.email} in workspace ${workspaceID}`
      );

    console.log("using user actor", user.id);
    provideActor({
      type: "user",
      properties: {
        workspaceID,
        userID: user.id,
      },
    });
  }
}
