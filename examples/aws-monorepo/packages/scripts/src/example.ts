import { Resource } from "sst";
import { Example } from "@aws-monorepo/core/example";

console.log(`${Example.hello()} Linked to ${Resource.Database.name}.`);
