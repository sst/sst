import { test, expect, beforeEach, afterAll } from "vitest";
import fs from "fs-extra";
import { hasResource, objectLike, ANY } from "./helper";
import { App, Api, Stack, ViteStaticSite } from "../src";

beforeEach(async () => {
  await clearBuildOutput();
});

afterAll(async () => {
  await clearBuildOutput();
});

async function clearBuildOutput() {
  fs.removeSync("test/vite-static-site/dist");
  fs.removeSync("test/vite-static-site/src/sst-env.d.ts");
  fs.removeSync("test/vite-static-site/src/my-env.d.ts");
}

/////////////////////////////
// Test Constructor
/////////////////////////////

test("constructor: typesPath undefined", async () => {
  const stack = new Stack(new App(), "stack");
  new ViteStaticSite(stack, "Site", {
    path: "test/vite-static-site",
  });
  expect(fs.existsSync("test/vite-static-site/src/sst-env.d.ts")).toBeTruthy();
});

test("constructor: typesPath defined", async () => {
  const stack = new Stack(new App(), "stack");
  new ViteStaticSite(stack, "Site", {
    path: "test/vite-static-site",
    typesPath: "src/my-env.d.ts",
  });
  expect(fs.existsSync("test/vite-static-site/src/sst-env.d.ts")).toBeFalsy();
  expect(fs.existsSync("test/vite-static-site/src/my-env.d.ts")).toBeTruthy();
});

test("constructor: default indexPage", async () => {
  const stack = new Stack(new App(), "stack");
  new ViteStaticSite(stack, "Site", {
    path: "test/vite-static-site",
  });
  hasResource(stack, "AWS::CloudFront::Distribution", {
    DistributionConfig: objectLike({
      DefaultRootObject: "index.html",
    }),
  });
});

test("constructor: default errorPage redirect to indexPage", async () => {
  const stack = new Stack(new App(), "stack");
  new ViteStaticSite(stack, "Site", {
    path: "test/vite-static-site",
  });
  hasResource(stack, "AWS::CloudFront::Distribution", {
    DistributionConfig: objectLike({
      CustomErrorResponses: [
        {
          ErrorCode: 403,
          ResponseCode: 200,
          ResponsePagePath: "/index.html",
        },
        {
          ErrorCode: 404,
          ResponseCode: 200,
          ResponsePagePath: "/index.html",
        },
      ],
    }),
  });
});

test("constructor: default buildCommand", async () => {
  const stack = new Stack(new App(), "stack");
  const api = new Api(stack, "Api");
  new ViteStaticSite(stack, "Site", {
    path: "test/vite-static-site",
    environment: {
      VITE_CONSTANT_ENV: "my-url",
      VITE_REFERENCE_ENV: api.url,
    },
  });
  const indexHtml = fs.readFileSync("test/vite-static-site/dist/index.html");
  expect(indexHtml.toString().trim()).toBe("my-url {{ VITE_REFERENCE_ENV }}");
});

test("constructor: default buildCommand override", async () => {
  const stack = new Stack(new App(), "stack");
  const api = new Api(stack, "Api");
  new ViteStaticSite(stack, "Site", {
    path: "test/vite-static-site",
    buildCommand:
      'rm -rf dist && mkdir dist && node -e "console.log(process.env.VITE_CONSTANT_ENV, process.env.VITE_REFERENCE_ENV, process.env.VITE_REFERENCE_ENV)" > dist/index.html',
    environment: {
      VITE_CONSTANT_ENV: "my-url",
      VITE_REFERENCE_ENV: api.url,
    },
  });
  const indexHtml = fs.readFileSync("test/vite-static-site/dist/index.html");
  expect(indexHtml.toString().trim()).toBe(
    "my-url {{ VITE_REFERENCE_ENV }} {{ VITE_REFERENCE_ENV }}"
  );
});

test("constructor: default fileOptions for cache control", async () => {
  const stack = new Stack(new App(), "stack");
  new ViteStaticSite(stack, "Site", {
    path: "test/vite-static-site",
  });
  hasResource(stack, "Custom::SSTBucketDeployment", {
    Sources: [
      {
        BucketName: ANY,
        ObjectKey: ANY,
      },
    ],
    DestinationBucketName: {
      Ref: "SiteS3Bucket43E5BB2F",
    },
    FileOptions: [
      [
        "--exclude",
        "*",
        "--include",
        "*.html",
        "--cache-control",
        "max-age=0,no-cache,no-store,must-revalidate",
      ],
      [
        "--exclude",
        "*",
        "--include",
        "*.js",
        "--include",
        "*.css",
        "--cache-control",
        "max-age=31536000,public,immutable",
      ],
    ],
    ReplaceValues: [],
  });
});

test("constructor: default replaceValues", async () => {
  const stack = new Stack(new App(), "stack");
  const api = new Api(stack, "Api");

  new ViteStaticSite(stack, "Site", {
    path: "test/vite-static-site",
    environment: {
      VITE_CONSTANT_ENV: "my-url",
      VITE_REFERENCE_ENV: api.url,
    },
  });
  hasResource(stack, "Custom::SSTBucketDeployment", {
    ReplaceValues: [
      {
        files: "**/*.html",
        search: "{{ VITE_REFERENCE_ENV }}",
        replace: { "Fn::GetAtt": ANY },
      },
      {
        files: "**/*.js",
        search: "{{ VITE_REFERENCE_ENV }}",
        replace: { "Fn::GetAtt": ANY },
      },
    ],
  });
});

test("constructor: default replaceValues override", async () => {
  const stack = new Stack(new App(), "stack");
  const api = new Api(stack, "Api");
  new ViteStaticSite(stack, "Site", {
    path: "test/vite-static-site",
    environment: {
      VITE_CONSTANT_ENV: "my-url",
      VITE_REFERENCE_ENV: api.url,
    },
    replaceValues: [
      {
        files: "*.txt",
        search: "{{ KEY }}",
        replace: "value",
      },
    ],
  });
  hasResource(stack, "Custom::SSTBucketDeployment", {
    ReplaceValues: [
      {
        files: "*.txt",
        search: "{{ KEY }}",
        replace: "value",
      },
      {
        files: "**/*.html",
        search: "{{ VITE_REFERENCE_ENV }}",
        replace: { "Fn::GetAtt": ANY },
      },
      {
        files: "**/*.js",
        search: "{{ VITE_REFERENCE_ENV }}",
        replace: { "Fn::GetAtt": ANY },
      },
    ],
  });
});
