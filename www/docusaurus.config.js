const config = require("./config");

module.exports = {
  title: "SST",
  tagline: "SST Docs",
  url: "https://docs.sst.dev",
  baseUrl: "/",
  onBrokenLinks: "throw",
  onBrokenMarkdownLinks: "throw",
  favicon: "img/favicon.ico",
  organizationName: "serverless-stack", // Usually your GitHub org/user name.
  projectName: "sst", // Usually your repo name.
  scripts: [
    {
      src: "https://kit.fontawesome.com/18c82fcd4d.js",
      crossorigin: "anonymous",
    },
  ],
  stylesheets: [
    "https://fonts.googleapis.com/css2?family=Roboto+Slab:wght@400;700&family=JetBrains+Mono:wght@400;700&family=Source+Sans+Pro:wght@300;400;600;700&display=swap",
  ],
  themeConfig: {
    prism: {
      additionalLanguages: ["csharp"],
      theme: require("prism-react-renderer/themes/github"),
      darkTheme: require("prism-react-renderer/themes/oceanicNext"),
    },
    // The following are used as defaults but are overriden by
    // the "socialCardsUrl" in the "customFields" below.
    image: "img/og-image.png",
    metaImage: "img/og-image.png",
    announcementBar: {
      id: "v2",
      content: `SST v2 is now available! Check out the <a href="https://docs.sst.dev/upgrade-guide">upgrade guide</a>.`,
      backgroundColor: "#395C6B",
      textColor: "#FFFFFF",
      isCloseable: false,
    },
    navbar: {
      title: "",
      logo: {
        alt: "SST Logo",
        src: "img/logo.svg",
      },
      items: [
        {
          to: "/",
          label: "Home",
          position: "left",
          activeBaseRegex: "^/(?!(constructs|clients|learn))",
        },
        {
          to: "/learn",
          label: "Learn",
          position: "left",
          activeBaseRegex: "^/learn",
        },
        {
          href: config.examples,
          label: "Examples",
          position: "left",
        },
        {
          to: "/constructs",
          label: "Constructs",
          position: "left",
          activeBaseRegex: "^/constructs$|^/constructs/(?!v0|v1)",
        },
        {
          to: "/clients",
          label: "Clients",
          position: "left",
          activeBaseRegex: "^/clients",
        },
        {
          href: config.discord,
          position: "right",
          "aria-label": "Discord community",
          className: "navbar__link__slack",
        },
        {
          href: config.github,
          position: "right",
          "aria-label": "GitHub repository",
          className: "navbar__link__github",
        },
      ],
    },
    footer: {
      style: "light",
      links: [
        {
          title: "Docs",
          items: [
            {
              label: "Get Started",
              to: "/",
            },
            {
              label: "What is SST",
              to: "what-is-sst",
            },
            {
              label: "Live Lambda Dev",
              to: "live-lambda-development",
            },
            {
              label: "Frequently Asked Questions",
              to: "faq",
            },
          ],
        },
        {
          title: "Community",
          items: [
            {
              label: "GitHub",
              href: config.github,
            },
            {
              label: "Twitter",
              href: config.twitter,
            },
            {
              label: "Discord",
              href: config.discord,
            },
            {
              label: "YouTube",
              href: config.youtube,
            },
          ],
        },
        {
          title: "Company",
          items: [
            {
              label: "Blog",
              href: "https://sst.dev/blog/",
            },
            {
              label: "About us",
              href: "https://sst.dev/about.html",
            },
            {
              label: "Contact us",
              href: `mailto:${config.email}`,
            },
            {
              label: "Join our team!",
              href: "https://sst.dev/careers.html",
            },
          ],
        },
      ],
      //copyright: `© ${new Date().getFullYear()} Anomaly Innovations`,
    },
    algolia: {
      appId: "8HCQAJFJQZ",
      indexName: "docs-serverless-stack",
      apiKey: "42ee2027a8dbe57a09913af0c27df9ad",
      // Turn on when we have versions
      //contextualSearch: true,
      // Had to update this in Aloglia's crawler editor to have it picked up
      // by Algolia - https://crawler.algolia.com
      exclusionPatterns: [
        // Exclude the "v0" and "v1" constructs docs from search results
        "https://docs.sst.dev/constructs/v0/**",
        "https://docs.sst.dev/constructs/v1/**",
      ],
    },
  },
  presets: [
    [
      "@docusaurus/preset-classic",
      {
        docs: {
          routeBasePath: "/",
          // exclude these pages from user accessing them
          exclude: [
            "**.about.md",
            "**.tsdoc.md",
            "advanced/monorepo-project-structure.md",
          ],
          sidebarCollapsible: false,
          sidebarPath: require.resolve("./sidebars.js"),
          showLastUpdateTime: true,
          // Please change this to your repo.
          editUrl: (params) => {
            if (params.docPath.startsWith("constructs")) {
              const splits = params.docPath.split("/");
              const name = splits[splits.length - 1].replace(".md", ".ts");
              return (
                "https://github.com/serverless-stack/sst/blob/master/packages/sst/src/constructs/" +
                name
              );
            }
            return (
              "https://github.com/serverless-stack/sst/blob/master/www/docs/" +
              params.docPath
            );
          },
        },
        theme: {
          customCss: require.resolve("./src/css/custom.css"),
        },
        googleAnalytics: {
          trackingID: "UA-3536629-11",
        },
      },
    ],
  ],
  plugins: [
    [
      "@docusaurus/plugin-client-redirects",
      {
        redirects: [
          {
            to: "/start/standalone",
            from: "/quick-start",
          },
          {
            to: "/live-lambda-development",
            from: "/working-locally",
          },
          {
            to: "/constructs/Api",
            from: "/constructs/ApolloApi",
          },
          {
            to: "/",
            from: "/deploying-your-app",
          },
          {
            to: "/live-lambda-development",
            from: "/debugging-with-vscode",
          },
          {
            to: "/advanced/iam-credentials",
            from: "/managing-iam-credentials",
          },
          {
            to: "/advanced/monitoring",
            from: "/monitoring-your-app-in-prod",
          },
          {
            to: "/migrating/cdk",
            from: "/migrating-from-cdk",
          },
          {
            to: "/migrating/serverless-framework",
            from: "/migrating-from-serverless-framework",
          },
        ],
      },
    ],
  ],
  customFields: {
    // Used in "src/theme/DocItem/index.js" to add og:image tags dynamically
    socialCardsUrl: "https://social-cards.sst.dev",
  },
};
