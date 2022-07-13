The `NextjsSite` construct is a higher level CDK construct that makes it easy to create a Next.js app. It provides a simple way to build and deploy the site to an S3 bucket; setup a CloudFront CDN for fast content delivery; and configure a custom domain for the website URL.

It also allows you to [automatically set the environment variables](#configuring-environment-variables) in your Next.js app directly from the outputs in your SST app.

## Next.js Features
The `NextjsSite` construct uses the [`@sls-next/lambda-at-edge`](https://github.com/serverless-nextjs/serverless-next.js/tree/master/packages/libs/lambda-at-edge) package from the [`serverless-next.js`](https://github.com/serverless-nextjs/serverless-next.js) project to build and package your Next.js app so that it can be deployed to Lambda@Edge and CloudFront.

:::note

To use the `NextjsSite` construct, you have to install `@sls-next/lambda-at-edge` as a dependency in your `package.json`.

```bash
npm install --save @sls-next/lambda-at-edge
```
:::

Most of the Next.js 11 features are supported, including:

- [Static Site Generation (SSG)](https://nextjs.org/docs/basic-features/data-fetching#getstaticprops-static-generation): Static pages are served out through the CloudFront CDN.
- [Server Side Rendering (SSR)](https://nextjs.org/docs/basic-features/data-fetching#getserversideprops-server-side-rendering): Server side rendering is performed at CloudFront edge locations using Lambda@Edge.
- [API Routes](https://nextjs.org/docs/api-routes/introduction): API requests are served from CloudFront edge locations using Lambda@Edge.
- [Incremental Static Regeneration (ISR)](https://nextjs.org/docs/basic-features/data-fetching#incremental-static-regeneration): Regeneration is performed using Lambda functions, and the generated pages will be served out through the CloudFront CDN.
- [Image Optimization](https://nextjs.org/docs/basic-features/image-optimization): Images are resized and optimized at CloudFront edge locations using Lambda@Edge.

Next.js 12 features like middleware and AVIF image are not yet supported. You can [read more about the features supported by `serverless-next.js`](https://github.com/serverless-nextjs/serverless-next.js#features). And you can [follow the progress on Next.js 12 support here](https://github.com/serverless-nextjs/serverless-next.js/issues/2016).