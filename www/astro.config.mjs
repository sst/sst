import { defineConfig } from "astro/config";
import starlight from "@astrojs/starlight";
import sitemap from "@astrojs/sitemap";
import config from "./config";

const mode = import.meta.env.MODE;

const sidebar = [
  {
    label: "What is Ion",
    link: "/docs/what-is-ion/",
  },
  {
    label: "Get Started",
    items: [
      { label: "Next.js", link: "/docs/quickstart/nextjs/" },
      { label: "Remix", link: "/docs/quickstart/remix/" },
      { label: "Astro", link: "/docs/quickstart/astro/" },
    ],
  },
  {
    label: "Features",
    items: [
      { label: "Linking", link: "/docs/linking-resources/" },
      { label: "Live Mode", link: "/docs/live-mode/" },
      { label: "Transform", link: "/docs/transform/" },
      { label: "Console", link: "/docs/console/" },
      { label: "Plugins", link: "/docs/plugins/" },
    ],
  },
  {
    label: "Components",
    items: [
      { label: "Cron", link: "/docs/component/cron/" },
      { label: "Astro", link: "/docs/component/astro/" },
      { label: "Remix", link: "/docs/component/remix/" },
      { label: "Nextjs", link: "/docs/component/nextjs/" },
      { label: "Worker", link: "/docs/component/worker/" },
      { label: "Vector", link: "/docs/component/vector/" },
      { label: "Secret", link: "/docs/component/secret/" },
      { label: "Bucket", link: "/docs/component/bucket/" },
      { label: "Function", link: "/docs/component/function/" },
      { label: "Postgres", link: "/docs/component/postgres/" },
    ],
  },
  {
    label: "Reference",
    items: [
      { label: "CLI", link: "/docs/reference/cli/" },
      { label: "Client", link: "/docs/reference/client/" },
    ],
  },
  {
    label: "How to",
    items: [
      { label: "Configure Ion", link: "/docs/configure-ion/" },
      { label: "Migrate from SST", link: "/docs/migrate-from-sst/" },
      { label: "Import Resources", link: "/docs/import-resources/" },
      { label: "Create an AWS Account", link: "/docs/create-an-aws-account/" },
    ],
  },
];

if (mode === "development") {
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
  integrations: [
    sitemap({
      filter: (page) => !page.includes("/dummy/"),
    }),
    starlight({
      title: "Ion Docs",
      logo: {
        light: "./src/assets/logo-light.svg",
        dark: "./src/assets/logo-dark.svg",
        replacesTitle: true,
      },
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
        baseUrl: "https://github.com/sst/ion/edit/main/www",
      },
      components: {
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
            "data-website-id": "31ffb9c3-2af4-4b7e-a1ee-060c71c60a89",
            "data-project-name": "Ion",
            "data-project-color": "#E27152",
            "data-modal-header-bg-color": "white",
            "data-button-hide": "true",
            "data-modal-title": "Ask AI",
            "data-font-family:": "monospace",
            "data-modal-title-font-family": "var(--__sl-font-headings)",
            "data-modal-border-radius": "0.625rem",
            "data-modal-example-questions":
              "How do I deploy a Next.js app?,How do I set a secret in Ion?,How do I set my AWS credentials?,How do I set a custom domain?",
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
