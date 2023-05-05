import { provideActor } from "@console/core/actor";
import { EventHandler } from "./handler";

export const handler = EventHandler(
  "aws.account.created",
  async (properties, actor) => {
    provideActor(actor);
    console.log("AWS Account Created", properties, actor);
  }
);

// When someone runs sst deploy
// once the deploy is done we generate metadata
// metadata contains info about the resources deployed
// metadata is stored in an s3 bucket
// we need to sync this whenever this happens into the SST Console database
