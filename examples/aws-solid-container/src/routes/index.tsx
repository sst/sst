import { Resource } from "sst";
import { Cluster } from "ioredis";
import { createAsync, cache } from "@solidjs/router";

const getCounter = cache(async () => {
  "use server";
  const redis = new Cluster(
    [{ host: Resource.MyRedis.host, port: Resource.MyRedis.port }],
    {
      dnsLookup: (address, callback) => callback(null, address),
      redisOptions: {
        tls: {},
        username: Resource.MyRedis.username,
        password: Resource.MyRedis.password,
      },
    }
  );

  return await redis.incr("counter");
}, "counter");

export const route = {
  load: () => getCounter(),
};

export default function Page() {
  const counter = createAsync(() => getCounter());

  return <h1>Hit counter: {counter()}</h1>;
}
