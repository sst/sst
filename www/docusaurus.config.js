const config = require("./config");

module.exports = {
  title: "Serverless Stack Toolkit",
  tagline: "Serverless Stack Toolkit Docs",
  url: "https://docs.serverless-stack.com",
  baseUrl: "/",
  onBrokenLinks: "throw",
  onBrokenMarkdownLinks: "warn",
  favicon: "img/favicon.ico",
  organizationName: "serverless-stack", // Usually your GitHub org/user name.
  projectName: "serverless-stack", // Usually your repo name.
  stylesheets: [
    "https://fonts.googleapis.com/css2?family=Roboto+Slab:wght@400;700&family=Source+Code+Pro:wght@400;700&family=Source+Sans+Pro:wght@300;400;700&display=swap",
  ],
  themeConfig: {
    sidebarCollapsible: false,
    image: "img/og-image.png", // used for meta tag, in particular og:image and twitter:image
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
          href: config.forums,
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
      style: "dark",
      links: [
        {
          title: "Docs",
          items: [
            {
              label: "Installation",
              to: "installation",
            },
            {
              label: "Live Lambda Development",
              to: "live-lambda-development",
            },
            {
              label: "@serverless-stack/resources",
              to: "packages/resources",
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
              label: "Twitter",
              href: "https://twitter.com/ServerlessStack",
            },
            {
              label: "Forums",
              href: config.forums,
            },
            {
              label: "Stack Overflow",
              href: "https://stackoverflow.com/questions/tagged/sst",
            },
          ],
        },
        {
          title: "More",
          items: [
            {
              label: "GitHub",
              href: config.github,
            },
            {
              label: "About Us",
              href: "https://anoma.ly/",
            },
            {
              label: "Newsletter",
              href: config.newsletter,
            },
            {
              label: "Brand Guide",
              href: "https://github.com/serverless-stack/identity",
            },
          ],
        },
      ],
      copyright: `© ${new Date().getFullYear()} Anomaly Innovations`,
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
};
