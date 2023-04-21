import { Replicache, TEST_LICENSE_KEY } from "replicache";

export const replicache = new Replicache({
  name: "sst",
  licenseKey: TEST_LICENSE_KEY,
});
