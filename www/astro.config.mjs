import { defineConfig } from "astro/config";
import starlight from "@astrojs/starlight";
import sitemap from "@astrojs/sitemap";
import config from "./config";
import sst from "astro-sst";

const sidebar = [
  {
    label: "Intro",
    slug: "docs",
  },
  {
    label: "Workflow",
    slug: "docs/workflow",
  },
  {
    label: "Get Started",
    items: [
      { label: "API", slug: "docs/start/aws/api" },
      { label: "Solid", slug: "docs/start/aws/solid" },
      { label: "tRPC", slug: "docs/start/aws/trpc" },
      { label: "Hono", slug: "docs/start/aws/hono" },
      { label: "Astro", slug: "docs/start/aws/astro" },
      { label: "Email", slug: "docs/start/aws/email" },
      { label: "Remix", slug: "docs/start/aws/remix" },
      { label: "Svelte", slug: "docs/start/aws/svelte" },
      { label: "Drizzle", slug: "docs/start/aws/drizzle" },
      { label: "Next.js", slug: "docs/start/aws/nextjs" },
      { label: "Realtime", slug: "docs/start/aws/realtime" },
      { label: "Container", slug: "docs/start/aws/container" },
      {
        label: "Cloudflare",
        items: [
          { label: "tRPC", slug: "docs/start/cloudflare/trpc" },
          { label: "Hono", slug: "docs/start/cloudflare/hono" },
          { label: "Worker", slug: "docs/start/cloudflare/worker" },
        ],
      },
    ],
  },
  {
    label: "Concepts",
    items: [
      "docs/live",
      "docs/state",
      "docs/linking",
      "docs/console",
      "docs/providers",
      "docs/components",
    ],
  },
  {
    label: "How to",
    items: [
      { label: "AWS Accounts", slug: "docs/aws-accounts" },
      { label: "IAM Credentials", slug: "docs/iam-credentials" },
      { label: "Migrate From v2", slug: "docs/migrate-from-v2" },
      { label: "Custom Domains", slug: "docs/custom-domains" },
      { label: "Import Resources", slug: "docs/import-resources" },
      { label: "Set up a Monorepo", slug: "docs/set-up-a-monorepo" },
      { label: "Share Across Stages", slug: "docs/share-across-stages" },
      { label: "Reference Resources", slug: "docs/reference-resources" },
    ],
  },
  {
    label: "AWS",
    items: [
      "docs/component/aws/vpc",
      "docs/component/aws/cron",
      "docs/component/aws/nuxt",
      "docs/component/aws/astro",
      "docs/component/aws/email",
      "docs/component/aws/remix",
      "docs/component/aws/nextjs",
      "docs/component/aws/queue",
      "docs/component/aws/vector",
      "docs/component/aws/router",
      "docs/component/aws/bucket",
      "docs/component/aws/cluster",
      "docs/component/aws/dynamo",
      "docs/component/aws/realtime",
      "docs/component/aws/sns-topic",
      "docs/component/aws/function",
      "docs/component/aws/postgres",
      "docs/component/aws/app-sync",
      "docs/component/aws/svelte-kit",
      "docs/component/aws/static-site",
      "docs/component/aws/solid-start",
      "docs/component/aws/kinesis-stream",
      "docs/component/aws/apigatewayv1",
      "docs/component/aws/apigatewayv2",
      "docs/component/aws/cognito-user-pool",
      "docs/component/aws/cognito-identity-pool",
      "docs/component/aws/apigateway-websocket",
    ],
  },
  {
    label: "Cloudflare",
    items: [
      "docs/component/cloudflare/kv",
      "docs/component/cloudflare/d1",
      "docs/component/cloudflare/worker",
      "docs/component/cloudflare/bucket",
    ],
  },
  {
    label: "Reference",
    items: [
      "docs/reference/cli",
      "docs/reference/sdk",
      "docs/reference/global",
      "docs/reference/config",
      "docs/component/secret",
      "docs/component/linkable",
    ],
  },
  {
    label: "Internal",
    collapsed: true,
    items: [
      {
        label: "Dns",
        items: [
          { label: "AWS", slug: "docs/component/aws/dns" },
          { label: "Vercel", slug: "docs/component/vercel/dns" },
          { label: "Cloudflare", slug: "docs/component/cloudflare/dns" },
        ],
      },
      "docs/component/aws/cdn",
      "docs/component/aws/service",
      {
        label: "Linkable",
        items: [
          { label: "binding", slug: "docs/component/cloudflare/binding" },
          { label: "permission", slug: "docs/component/aws/permission" },
        ],
      },
      "docs/component/aws/app-sync-resolver",
      "docs/component/aws/app-sync-function",
      "docs/component/aws/app-sync-data-source",
      "docs/component/aws/cognito-user-pool-client",
      "docs/component/aws/apigatewayv2-url-route",
      "docs/component/aws/apigatewayv1-authorizer",
      "docs/component/aws/apigatewayv2-authorizer",
      "docs/component/aws/queue-lambda-subscriber",
      "docs/component/aws/bucket-lambda-subscriber",
      "docs/component/aws/sns-topic-queue-subscriber",
      "docs/component/aws/dynamo-lambda-subscriber",
      "docs/component/aws/realtime-lambda-subscriber",
      "docs/component/aws/sns-topic-lambda-subscriber",
      "docs/component/aws/apigatewayv1-lambda-route",
      "docs/component/aws/apigatewayv2-lambda-route",
      "docs/component/aws/apigateway-websocket-route",
      "docs/component/aws/kinesis-stream-lambda-subscriber",
    ],
  },
  { label: "Examples", slug: "docs/examples" },
  {
    label: "Deprecated",
    collapsed: true,
    items: [{ label: "Vpc.v1", slug: "docs/component/aws/vpc-v1" }],
  },
];

if (import.meta.env.DEV) {
  sidebar.push({
    label: "Dummy",
    items: [
      { slug: "dummy/tsdoc" },
      { slug: "dummy/markdown" },
    ],
  });
}

// https://astro.build/config
export default defineConfig({
  site: "https://sst.dev",
  adapter: sst(),
  server: {
    host: "0.0.0.0",
  },
  devToolbar: {
    enabled: false,
  },
  redirects: {
    "/install": "https://raw.githubusercontent.com/sst/ion/dev/install",
    "/discord": "https://discord.gg/sst",
    "/guide": "https://guide.sst.dev",
  },
  integrations: [
    sitemap({
      filter: (page) => !page.includes("/dummy/"),
    }),
    starlight({
      title: "SST",
      logo: {
        light: "./src/assets/logo-light.svg",
        dark: "./src/assets/logo-dark.svg",
        replacesTitle: true,
      },
      lastUpdated: true,
      favicon: "/favicon.svg",
      pagination: false,
      customCss: [
        "@fontsource-variable/rubik",
        "@fontsource-variable/roboto-mono",
        "@fontsource/ibm-plex-mono/400.css",
        "@fontsource/ibm-plex-mono/400-italic.css",
        "@fontsource/ibm-plex-mono/500.css",
        "@fontsource/ibm-plex-mono/600.css",
        "@fontsource/ibm-plex-mono/700.css",
        "./src/custom.css",
        "./src/styles/splash.css",
        "./src/styles/lander.css",
        "./src/styles/markdown.css",
        "./src/styles/tsdoc.css",
      ],
      social: {
        "x.com": config.twitter,
        discord: config.discord,
        github: config.github,
      },
      editLink: {
        baseUrl: "https://github.com/sst/ion/edit/dev/www",
      },
      components: {
        Hero: "./src/components/Hero.astro",
        Head: "./src/components/Head.astro",
        Header: "./src/components/Header.astro",
        Footer: "./src/components/Footer.astro",
        PageTitle: "./src/components/PageTitle.astro",
        MobileMenuFooter: "./src/components/MobileMenuFooter.astro",
      },
      head: [
        {
          tag: "script",
          attrs: {
            src: "https://widget.kapa.ai/kapa-widget.bundle.js",
            "data-website-id": "6853540a-5c1e-4de3-9e2f-b893b6b825a8",
            "data-project-name": "Ion",
            "data-project-color": "#E27152",
            "data-modal-header-bg-color": "white",
            "data-button-hide": "true",
            "data-modal-title": "Ask AI",
            "data-font-family": "var(--__sl-font)",
            "data-modal-title-font-family": "var(--__sl-font-headings)",
            "data-modal-border-radius": "0.625rem",
            "data-modal-example-questions":
              "How do I deploy a Next.js app?,How do I set a secret?,How do I link resources together?,How do I set a custom domain for my API?",
            "data-modal-override-open-class": "kapa-modal-open",
            "data-project-logo": "/logo-square.png",
            async: true,
          },
        },
        // Add ICO favicon fallback for Safari
        {
          tag: "link",
          attrs: {
            rel: "icon",
            href: "/favicon.ico",
            sizes: "32x32",
          },
        },
        // Add light/dark mode favicon
        {
          tag: "link",
          attrs: {
            rel: "icon",
            href: "/favicon.svg",
            media: "(prefers-color-scheme: light)",
          },
        },
        {
          tag: "link",
          attrs: {
            rel: "icon",
            href: "/favicon-dark.svg",
            media: "(prefers-color-scheme: dark)",
          },
        },
      ],
      sidebar,
    }),
  ],
});
