const config = require("./config");

module.exports = {
  title: "Serverless Stack (SST)",
  tagline: "Serverless Stack Docs",
  url: "https://docs.serverless-stack.com",
  baseUrl: "/",
  onBrokenLinks: "throw",
  onBrokenMarkdownLinks: "warn",
  favicon: "img/favicon.ico",
  organizationName: "serverless-stack", // Usually your GitHub org/user name.
  projectName: "serverless-stack", // Usually your repo name.
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
    /**
    announcementBar: {
      id: "announcement",
      content: `If you like Serverless Stack, <a target="_blank" href="${config.github}">give it a star on GitHub</a>! <span class="icon" />`,
      backgroundColor: "#395C6B",
      textColor: "#FFFFFF",
      isCloseable: true,
    },
    **/
    announcementBar: {
      id: "announcement",
      content: `<a target="_blank" href="https://v1conf.sst.dev">Register for SST 1.0 Conf</a>, our first-ever conference on May 17th!`,
      backgroundColor: "#395C6B",
      textColor: "#FFFFFF",
      isCloseable: true,
    },
    navbar: {
      title: "",
      logo: {
        alt: "SST Logo",
        src: "img/logo.svg",
      },
      items: [
        {
          to: "/constructs",
          label: "Constructs",
          position: "left",
          activeBaseRegex: "^/constructs$|^/constructs/(?!v0)",
        },
        {
          href: config.guide,
          label: "Guide",
          position: "left",
        },
        {
          href: config.home,
          label: "About",
          position: "left",
        },
        {
          href: config.examples,
          label: "Examples",
          position: "left",
        },
        {
          href: config.slack_invite,
          position: "right",
          "aria-label": "Slack community",
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
              label: "Installation",
              to: "installation",
            },
            {
              label: "@serverless-stack/cli",
              to: "packages/cli",
            },
            {
              label: "Live Lambda Development",
              to: "live-lambda-development",
            },
          ],
        },
        {
          title: "Community",
          items: [
            {
              label: "Slack",
              href: config.slack_invite,
            },
            {
              label: "GitHub",
              href: config.github,
            },
            {
              label: "Twitter",
              href: config.twitter,
            },
            {
              label: "Forums",
              href: config.forum,
            },
          ],
        },
        {
          title: "Company",
          items: [
            {
              label: "Blog",
              href: "https://serverless-stack.com/blog/",
            },
            {
              label: "About us",
              href: "https://serverless-stack.com/about.html",
            },
            {
              label: "Contact us",
              href: `mailto:${config.email}`,
            },
            {
              label: "Join our team!",
              href: "https://serverless-stack.com/careers.html",
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
    },
  },
  presets: [
    [
      "@docusaurus/preset-classic",
      {
        docs: {
          routeBasePath: "/",
          exclude: ["constructs/*.snippets.md"],
          sidebarCollapsible: false,
          sidebarPath: require.resolve("./sidebars.js"),
          showLastUpdateTime: true,
          // Please change this to your repo.
          editUrl: (params) => {
            if (params.docPath.startsWith("constructs")) {
              const splits = params.docPath.split("/");
              const name = splits[splits.length - 1].replace(".md", ".ts");
              return (
                "https://github.com/serverless-stack/serverless-stack/blob/master/packages/resources/src/" +
                name
              );
            }
            return (
              "https://github.com/serverless-stack/serverless-stack/blob/master/www/docs/" +
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
            to: "/live-lambda-development",
            from: "/working-locally",
          },
          {
            to: "/constructs/GraphQLApi",
            from: "/constructs/ApolloApi",
          },
          {
            to: "/installation",
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
    socialCardsUrl: "https://social-cards.serverless-stack.com",
  },
};
