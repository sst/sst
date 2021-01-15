module.exports = {
  title: 'My Site',
  tagline: 'The tagline of my site',
  url: 'https://docs.serverless-stack.com',
  baseUrl: '/',
  onBrokenLinks: 'throw',
  onBrokenMarkdownLinks: 'warn',
  favicon: 'img/favicon.ico',
  organizationName: 'serverless-stack', // Usually your GitHub org/user name.
  projectName: 'serverless-stack', // Usually your repo name.
  stylesheets: [
    "https://fonts.googleapis.com/css2?family=Roboto+Slab:wght@400;700&family=Source+Code+Pro:wght@400;700&family=Source+Sans+Pro:wght@300;400;700&display=swap",
  ],
  themeConfig: {
    navbar: {
      title: 'SST',
      logo: {
        alt: 'SST Logo',
        src: 'img/logo.svg',
      },
      items: [
        /**
        {
          to: 'docs/',
          activeBasePath: 'docs',
          label: 'Docs',
          position: 'left',
        },
        {to: 'blog', label: 'Blog', position: 'left'},
        **/
        {
          href: 'https://github.com/serverless-stack/serverless-stack',
          label: 'GitHub',
          position: 'right',
        },
      ],
    },
    footer: {
      style: 'dark',
      links: [
        {
          title: 'Docs',
          items: [
            {
              label: 'Style Guide',
              to: 'docs/',
            },
            {
              label: 'Second Doc',
              to: 'docs/doc2/',
            },
          ],
        },
        {
          title: 'Community',
          items: [
            {
              label: 'Stack Overflow',
              href: 'https://stackoverflow.com/questions/tagged/sst',
            },
            {
              label: 'Newsletter',
              href: 'https://emailoctopus.com/lists/1c11b9a8-1500-11e8-a3c9-06b79b628af2/forms/subscribe',
            },
            {
              label: 'Twitter',
              href: 'https://twitter.com/ServerlessStack',
            },
            {
              label: 'Slack',
              href: 'https://join.slack.com/t/serverless-stack/shared_invite/zt-kqna615x-AFoTXvrglivZqJZcnTzKZA',
            },
          ],
        },
        {
          title: 'More',
          items: [
            {
              label: 'Brand Guide',
              href: 'https://github.com/serverless-stack/identity',
            },
            {
              label: 'About Us',
              href: 'https://anoma.ly/',
            },
            {
              label: 'GitHub',
              href: 'https://github.com/serverless-stack/serverless-stack',
            },
            {
              label: 'Guide',
              to: 'https://serverless-stack.com',
            },
          ],
        },
      ],
      copyright: `Copyright © ${new Date().getFullYear()} Anomaly Innovations, Inc`,
    },
  },
  presets: [
    [
      '@docusaurus/preset-classic',
      {
        docs: {
          routeBasePath: '/',
          sidebarPath: require.resolve('./sidebars.js'),
          // Please change this to your repo.
          editUrl:
            'https://github.com/serverless-stack/serverless-stack/edit/master/docs/',
        },
        theme: {
          customCss: require.resolve('./src/css/custom.css'),
        },
      },
    ],
  ],
};
