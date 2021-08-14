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
    "https://fonts.googleapis.com/css2?family=Roboto+Slab:wght@400;700&family=Source+Code+Pro:wght@400;700&family=Source+Sans+Pro:wght@300;400;700&display=swap",
  ],
  themeConfig: {
    prism: {
      additionalLanguages: ["csharp"],
    },
    sidebarCollapsible: false,
    // The following are used as defaults but are overriden by
    // the "socialCardsUrl" in the "customFields" below.
    image: "img/og-image.png",
    metaImage: "img/og-image.png",
    googleAnalytics: {
      trackingID: "UA-3536629-11",
    },
    navbar: {
      title: "",
      logo: {
        alt: "SST Logo",
        src: "img/logo.svg",
      },
      items: [
        {
          href: config.slack,
          label: "Slack",
          position: "right",
        },
        {
          href: config.forum,
          label: "Forums",
          position: "right",
        },
        {
          href: "https://github.com/serverless-stack/serverless-stack",
          label: "GitHub",
          position: "right",
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
              href: config.slack,
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
      apiKey: "89c24ba093a7153c016644142b1260b3",
      indexName: "docs-serverless-stack",
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
          sidebarPath: require.resolve("./sidebars.js"),
          // Please change this to your repo.
          editUrl:
            "https://github.com/serverless-stack/serverless-stack/edit/master/www/",
        },
        theme: {
          customCss: require.resolve("./src/css/custom.css"),
        },
      },
    ],
  ],
  customFields: {
    // Used in "src/theme/DocItem/index.js" to add og:image tags dynamically
    socialCardsUrl: "https://social-cards.serverless-stack.com",
  },
};
