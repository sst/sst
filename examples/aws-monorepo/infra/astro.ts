import { api } from "./api";

const bucket = new sst.aws.Bucket("MyBucket");
export const astro = new sst.aws.Astro("Astro", {
  path: "packages/astro",
  link: [bucket],
  environment: {
    VITE_API_URL: api.url,
  },
});

export const astro2 = new sst.aws.Astro("Astro2", {
  path: "packages/astro",
  link: [bucket],
  environment: {
    VITE_API_URL: api.url,
    FOO: "1",
  },
  dev: {
    autostart: false,
  },
});
