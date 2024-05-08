import { defineConfig } from "astro/config";
import starlight from "@astrojs/starlight";
import sitemap from "@astrojs/sitemap";
import config from "./config";
import sst from "astro-sst";

const sidebar = [
  {
    label: "What is Ion",
    link: "/docs/",
  },
  {
    label: "Get Started",
    items: [
      { label: "API", link: "/docs/start/aws/api/" },
      { label: "tRPC", link: "/docs/start/aws/trpc/" },
      { label: "Hono", link: "/docs/start/aws/hono/" },
      { label: "Astro", link: "/docs/start/aws/astro/" },
      { label: "Email", link: "/docs/start/aws/email/" },
      { label: "Remix", link: "/docs/start/aws/remix/" },
      { label: "Svelte", link: "/docs/start/aws/svelte/" },
      { label: "Drizzle", link: "/docs/start/aws/drizzle/" },
      { label: "Next.js", link: "/docs/start/aws/nextjs/" },
      { label: "Container", link: "/docs/start/aws/container/" },
      {
        label: "Cloudflare",
        items: [
          { label: "tRPC", link: "/docs/start/cloudflare/trpc/" },
          { label: "Hono", link: "/docs/start/cloudflare/hono/" },
          { label: "Worker", link: "/docs/start/cloudflare/worker/" },
        ],
      },
    ],
  },
  {
    label: "Concepts",
    items: [
      { label: "Live", link: "/docs/live/" },
      { label: "Linking", link: "/docs/linking/" },
      { label: "Console", link: "/docs/console/" },
      { label: "Providers", link: "/docs/providers/" },
      { label: "Components", link: "/docs/components/" },
    ],
  },
  {
    label: "AWS",
    items: [
      { label: "Vpc", link: "/docs/component/aws/vpc/" },
      { label: "Cron", link: "/docs/component/aws/cron/" },
      { label: "Astro", link: "/docs/component/aws/astro/" },
      { label: "Email", link: "/docs/component/aws/email/" },
      { label: "Remix", link: "/docs/component/aws/remix/" },
      { label: "Nextjs", link: "/docs/component/aws/nextjs/" },
      { label: "Queue", link: "/docs/component/aws/queue/" },
      { label: "Vector", link: "/docs/component/aws/vector/" },
      { label: "Bucket", link: "/docs/component/aws/bucket/" },
      { label: "Router", link: "/docs/component/aws/router/" },
      { label: "Cluster", link: "/docs/component/aws/cluster/" },
      { label: "Dynamo", link: "/docs/component/aws/dynamo/" },
      { label: "Realtime", link: "/docs/component/aws/realtime/" },
      { label: "SnsTopic", link: "/docs/component/aws/sns-topic/" },
      { label: "Function", link: "/docs/component/aws/function/" },
      { label: "AppSync", link: "/docs/component/aws/app-sync/" },
      { label: "Postgres", link: "/docs/component/aws/postgres/" },
      { label: "SvelteKit", link: "/docs/component/aws/svelte-kit/" },
      { label: "StaticSite", link: "/docs/component/aws/static-site/" },
      { label: "SolidStart", link: "/docs/component/aws/solid-start/" },
      {
        label: "ApiGatewayV2",
        link: "/docs/component/aws/apigatewayv2/",
      },
      {
        label: "CognitoUserPool",
        link: "/docs/component/aws/cognito-user-pool/",
      },
      {
        label: "CognitoIdentityPool",
        link: "/docs/component/aws/cognito-identity-pool/",
      },
      {
        label: "ApiGatewayWebSocket",
        link: "/docs/component/aws/apigateway-websocket/",
      },
    ],
  },
  {
    label: "Cloudflare",
    items: [
      { label: "D1", link: "/docs/component/cloudflare/d1/" },
      { label: "KV", link: "/docs/component/cloudflare/kv/" },
      { label: "Worker", link: "/docs/component/cloudflare/worker/" },
      { label: "Bucket", link: "/docs/component/cloudflare/bucket/" },
    ],
  },
  {
    label: "Reference",
    items: [
      { label: "CLI", link: "/docs/reference/cli/" },
      { label: "SDK", link: "/docs/reference/sdk/" },
      { label: "Global", link: "/docs/reference/global/" },
      { label: "Config", link: "/docs/reference/config/" },
      { label: "Secret", link: "/docs/component/secret/" },
    ],
  },
  {
    label: "How to",
    items: [
      // { label: "Migrate from SST", link: "/docs/migrate-from-sst/" },
      // { label: "Import Resources", link: "/docs/import-resources/" },
      { label: "Custom Domains", link: "/docs/custom-domains/" },
    ],
  },
  {
    label: "Internal",
    collapsed: true,
    items: [
      {
        label: "Dns",
        items: [
          { label: "AWS", link: "/docs/component/aws/dns/" },
          {
            label: "Vercel",
            link: "/docs/component/vercel/dns/",
          },
          {
            label: "Cloudflare",
            link: "/docs/component/cloudflare/dns/",
          },
        ],
      },
      { label: "Cdn", link: "/docs/component/aws/cdn/" },
      { label: "Service", link: "/docs/component/aws/service/" },
      {
        label: "AppSyncResolver",
        link: "/docs/component/aws/app-sync-resolver/",
      },
      {
        label: "AppSyncFunction",
        link: "/docs/component/aws/app-sync-function/",
      },
      {
        label: "AppSyncDataSource",
        link: "/docs/component/aws/app-sync-data-source/",
      },
      {
        label: "CognitoUserPoolClient",
        link: "/docs/component/aws/cognito-user-pool-client/",
      },
      {
        label: "QueueLambdaSubscriber",
        link: "/docs/component/aws/queue-lambda-subscriber/",
      },
      {
        label: "BucketLambdaSubscriber",
        link: "/docs/component/aws/bucket-lambda-subscriber/",
      },
      {
        label: "SnsTopicQueueSubscriber",
        link: "/docs/component/aws/sns-topic-queue-subscriber/",
      },
      {
        label: "DynamoLambdaSubscriber",
        link: "/docs/component/aws/dynamo-lambda-subscriber/",
      },
      {
        label: "RealtimeLambdaSubscriber",
        link: "/docs/component/aws/realtime-lambda-subscriber/",
      },
      {
        label: "SnsTopicLambdaSubscriber",
        link: "/docs/component/aws/sns-topic-lambda-subscriber/",
      },
      {
        label: "ApiGatewayV2LambdaRoute",
        link: "/docs/component/aws/apigatewayv2-lambda-route/",
      },
      {
        label: "ApiGatewayWebSocketLambdaRoute",
        link: "/docs/component/aws/apigateway-websocket-lambda-route/",
      },
    ],
  },
  { label: "Examples", link: "/docs/examples/" },
];

if (import.meta.env.DEV) {
  sidebar.push({
    label: "Dummy",
    items: [
      { label: "TS Doc", link: "/dummy/tsdoc/" },
      { label: "Markdown", link: "/dummy/markdown/" },
    ],
  });
}

// https://astro.build/config
export default defineConfig({
  site: "https://ion.sst.dev",
  adapter: sst(),
  server: {
    host: "0.0.0.0",
  },
  devToolbar: {
    enabled: false,
  },
  redirects: {
    "/install": "https://raw.githubusercontent.com/sst/ion/dev/install",
  },
  integrations: [
    sitemap({
      filter: (page) => !page.includes("/dummy/"),
    }),
    starlight({
      title: "Ion",
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
