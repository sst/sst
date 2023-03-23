---
id: quick-start
title: Quick Start
description: "Take SST for a spin and create your project."
---

import config from "../config";
import TabItem from "@theme/TabItem";
import HeadlineText from "@site/src/components/HeadlineText";
import MultiPackagerCode from "@site/src/components/MultiPackagerCode";

export const ConsoleUrl = ({url}) =>
<a href={url}>{url.replace("https://","").replace(/\/$/, "")}</a>;

<HeadlineText>

Take SST for a spin and create your first project.

</HeadlineText>

---

```bash
npx create-next-app@latest
```

Pick all the default options.

```txt
✔ What is your project named? … sst-next-app
✔ Would you like to use TypeScript with this project? … No / Yes
✔ Would you like to use ESLint with this project? … No / Yes
✔ Would you like to use `src/` directory with this project? … No / Yes
✔ Would you like to use experimental `app/` directory with this project? … No / Yes
✔ What import alias would you like configured? … @/*
```

Move to the new project directory.

```bash
cd sst-next-app
```

```bash
npx create-sst@latest
npm install
```

Deploy it to prod.

```bash
npx sst deploy --stage prod
```

Let's add a file upload feature to our app. Start SST locally.

```bash
npx sst dev
```

The first time your run SST in a project it'll ask you for the name of a personal stage. Let's just use the default — your username.

```bash
Please enter a name you’d like to use for your personal stage. Or hit enter to use jayair:
```

Add an S3 bucket to your app.

```ts title="sst.config.ts"
stacks(app) {
  app.stack(function Site(ctx) {
    const bucket = new Bucket(ctx.stack, "public", {
      cors: true,
    });
    const site = new NextjsSite(ctx.stack, "site", {
      path: ".",
      bind: [bucket],
    });

    ctx.stack.addOutputs({
      SiteUrl: site.url || "http://localhost:3000",
    });
  });
},
```

We are [binding](resource-binding.md) the bucket to our Next.js app. This allows us to access the bucket in our app.

```ts {3}
const site = new NextjsSite(ctx.stack, "site", {
  path: ".",
  bind: [bucket],
});
```

Add the import.

```diff title="sst.config.ts"
- import { NextjsSite } from "sst/constructs";
+ import { Bucket, NextjsSite } from "sst/constructs";
```

This will deploy some changes to your SST app.

Now in a new terminal session, start Next.js locally.

```bash
npm run dev
```

To import a file to S3 we need to generate a presigned URL first. Let's create an API for that.

Add this to `pages/api/presigned.ts`.

```ts title="pages/api/presigned.ts"
import { Bucket } from "sst/node/bucket";
import { NextApiRequest, NextApiResponse } from "next";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

export default async function handler(
  request: NextApiRequest,
  response: NextApiResponse
) {
  const name = request.query.name as string;
  const type = request.query.type as string;

  // Generate a presigned URL
  const command = new PutObjectCommand({
    Key: name,
    ContentType: type,
    ACL: "public-read",
    Bucket: Bucket.public.bucketName,
  });
  const url = await getSignedUrl(new S3Client({}), command, {
    expiresIn: 60 * 60,
  });

  response.status(200).json({ url });
}
```

This takes the file name and file type and generates a presgined URL that we can use to upload the file.

Thanks to [Resource Binding](resource-binding.md) we can access our S3 bucket in a typesafe way in our Next.js app.

```ts {5}
const command = new PutObjectCommand({
  Key: name,
  ContentType: type,
  ACL: "public-read",
  Bucket: Bucket.public.bucketName,
});
```

Install the AWS S3 JS SDK.

```bash
npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner
```

Let's add the form.

Replace your `pages/index.tsx` with.

```tsx title="pages/index.tsx"
import Head from "next/head";
import { Inter } from "next/font/google";
import styles from "@/styles/Home.module.css";

const inter = Inter({ subsets: ["latin"] });

export default function Home() {
  async function handleSubmit(e: React.SyntheticEvent) {
    e.preventDefault();

    const target = e.target as typeof e.target & {
      file: { files: FileList };
    };
    const file = target.file.files?.[0]!;

    // Get the presigned URL
    const res = await fetch(
      `/api/presigned?name=${file.name}&fileType=${file.type}`
    );
    const presigned = await res.json();

    // Upload the file
    const { url } = await fetch(presigned.url, {
      body: file,
      method: "PUT",
      headers: { "Content-Type": file.type },
    });

    window.location.href = url.split("?")[0];
  }

  return (
    <>
      <Head>
        <title>SSTxNext</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <main className={styles.main}>
        <form onSubmit={handleSubmit} className={styles.form}>
          <input
            required
            name="file"
            type="file"
            accept="image/png, image/jpeg"
          />
          <button type="submit" className={inter.className}>
            Upload
          </button>
        </form>
      </main>
    </>
  );
}
```

Now in your browser you should be able to upload an image!

![Next.js SST S3 upload](/img/quick-start/nextjs-sst-s3-upload.png)

We want to store a list of all the files that've been uploaded.

Let's add a database to our app. We'll use DynamoDB and create a table with the file name as the key.

Add this below bucket definition in `sst.config.ts`.

```ts title="sst.config.ts"
const table = new Table(ctx.stack, "files", {
  fields: {
    name: "string",
  },
  primaryIndex: { partitionKey: "name" },
});
```

Add the import up top.

```diff title="sst.config.ts"
- import { Bucket, NextjsSite } from "sst/constructs";
+ import { Table, Bucket, NextjsSite } from "sst/constructs";
```

We'll also bind our Next.js app to the new Table.

```diff title="sst.config.ts"
- bind: [bucket],
+ bind: [table, bucket],
```

This will create a new DynamoDB table for you.

Let's create a type for what we want to store in our table.

Add this to `types/File.ts`.

```ts title="types/File.ts"
type File = {
  url: string;
  name: string;
  resized: boolean;
};

export default File;
```

We'll save the uploaded file to the table. Add this below the `const url = ...` line in `pages/api/presigned.ts`.

```ts title="pages/api/presgined.ts"
// Save the file to the db
const db = DynamoDBDocumentClient.from(new DynamoDBClient({}));
await db.send(
  new PutCommand({
    TableName: Table.files.tableName,
    Item: {
      name,
      resized: false,
      url: url.split("?")[0],
    } as File,
  })
);
```

Let's add the imports.

```ts title="pages/api/presgined.ts"
import File from "../../types/File";
import { Table } from "sst/node/table";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { PutCommand, DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
```

Let's install the AWS DynamoDB JS SDK.

```bash
npm install @aws-sdk/lib-dynamodb @aws-sdk/client-dynamodb
```

Next, let's load the list of the files when we load our app.

Add this to your `pages/index.tsx`.

```ts title="pages/index.tsx"
export async function getServerSideProps() {
  // Get the list of files
  const db = DynamoDBDocumentClient.from(new DynamoDBClient({}));
  const results = await db.send(
    new ScanCommand({
      TableName: Table.files.tableName,
    })
  );

  return {
    props: { files: results.Items },
  };
}
```

Let's load these props in our `Home` component.

```diff title="pages/index.tsx"
- export default function Home() {
+ export default function Home({ files }: { files: File[] }) {
```

Render the list of files. Add this below our `form`.

<!-- prettier-ignore-start -->
```tsx title="pages/index.tsx"
{files.length > 0 && (
  <table className={styles.list}>
    <tbody>
      {files.map((file) => (
        <tr key={file.name}>
          <td>
            <a href={file.url} className={inter.className}>
              {file.name}
            </a>
          </td>
          <td>
            <button disabled={file.resized} className={inter.className}>
              {file.resized ? "Resized" : "Resize"}
            </button>
          </td>
        </tr>
      ))}
    </tbody>
  </table>
)}
```
<!-- prettier-ignore-end -->

For now we'll just reload the page after an upload. Replace the following line in `pages/index.tsx`.

```diff title="pages/index.tsx"
- window.location.href = url.split("?")[0];
+ window.location.reload();
```

Let's add the imports.

```ts title="pages/index.tsx"
import File from "../types/File";
import { Table } from "sst/node/table";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { ScanCommand, DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
```

Add some styles. Replace `styles/Home.module.css`.

```css title="styles/Home.module.css"
.main {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  padding: 6rem;
  min-height: 100vh;
}

.form {
  display: inherit;
  justify-content: inherit;
  align-items: inherit;
  padding: 1rem;
  background-color: rgba(var(--callout-rgb), 0.5);
  border: 1px solid rgba(var(--callout-border-rgb), 0.3);
  border-radius: var(--border-radius);
}

.form input {
  margin-right: 1rem;
  font-family: var(--font-mono);
}

.list {
  margin-top: 2rem;
  background-color: rgba(var(--callout-rgb), 0.5);
  border: 1px solid rgba(var(--callout-border-rgb), 0.3);
  border-radius: var(--border-radius);
  padding: 0.5rem 1rem;
  font-size: 0.875rem;
}

.list button {
  margin: 0.5rem 0 0.5rem 1rem;
  padding: 0.3rem 0.6rem;
  font-size: 0.75rem;
}
```

And add this at the bottom of `styles/globals.css`.

```css title="styles/globals.css"
button {
  appearance: none;
  border: 0;
  padding: 0.5rem 0.75rem;

  border-radius: calc(1rem - var(--border-radius));
  background: linear-gradient(
    to bottom right,
    rgba(var(--tile-start-rgb), 1),
    rgba(var(--tile-end-rgb), 1)
  );
  border: 1px solid rgba(var(--callout-border-rgb), 1);
  font-size: 0.875rem;
  font-weight: 500;
}

button:active:enabled {
  background: linear-gradient(
    to top left,
    rgba(var(--tile-start-rgb), 1),
    rgba(var(--tile-end-rgb), 1)
  );
}

button:disabled {
  border: 1px solid rgba(var(--callout-border-rgb), 0.3);
}
```

Now if you head over to your browser and upload a image, it should reload with the list of uploaded files!

![Next.js SST DynamoDB load](/img/quick-start/nextjs-sst-dynamodb-load.png)

Let's add some async features to our app. We'll implement the resize image feature using a pub/sub service called SNS.

Add a new `Topic` below the `Table` definition in `sst.config.ts`.

```ts title="sst.config.ts"
const topic = new Topic(ctx.stack, "resizer", {
  defaults: {
    function: {
      bind: [table],
    },
  },
  subscribers: {
    resizer: "functions/resizer.handler",
  },
});
```

We want our async function to be able to write to our table, so we are using `bind` here too.

Our Next.js app needs to send the async call, so it needs access as well.

Change this line in the Next.js definition.

```diff title="sst.config.ts"
- bind: [table, bucket],
+ bind: [topic, table, bucket],
```

Update the imports.

```diff title="sst.config.ts"
- import { Table, Bucket, NextjsSite } from "sst/constructs";
+ import { Topic, Table, Bucket, NextjsSite } from "sst/constructs";
```

Now add a Next.js API to trigger the async workflow.

Add the following to `pages/api/resize.ts`.

```ts title="pages/api/resize.ts"
import { Topic } from "sst/node/topic";
import { NextApiRequest, NextApiResponse } from "next";
import { SNSClient, PublishCommand } from "@aws-sdk/client-sns";

export default async function handler(
  request: NextApiRequest,
  response: NextApiResponse
) {
  const client = new SNSClient({});
  await client.send(
    new PublishCommand({
      TopicArn: Topic.resizer.topicArn,
      Message: request.query.name as string,
    })
  );

  response.status(200);
}
```

We need to install the AWS JS SNS SDK client.

```bash
npm install @aws-sdk/client-sns
```

Let's implement the listener function for our async workflow.

Create a new file in `functions/resizer.ts` with.

```ts title="functions/resizer.ts"
import { Table } from "sst/node/table";
import type { SNSEvent } from "aws-lambda";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { UpdateCommand, DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";

export async function handler(event: SNSEvent) {
  const name = event.Records[0].Sns.Message;

  // Resize the image
  // https://sst.dev/examples/how-to-automatically-resize-images-with-serverless.html

  // Mark the image as resized
  const db = DynamoDBDocumentClient.from(new DynamoDBClient({}));
  await db.send(
    new UpdateCommand({
      TableName: Table.files.tableName,
      Key: {
        name,
      },
      UpdateExpression: "SET resized = :resized",
      ExpressionAttributeValues: {
        ":resized": true,
      },
    })
  );
}
```

We need to install Lambda types for this.

```bash
npm install --save-dev @types/aws-lambda
```

Now let's call this API when the _Resize_ button in our app is pressed.

Replace the following in `pages/index.tsx`.

```diff title="pages/index.tsx"
- <button disabled={file.resized} className={inter.className}>
+ <button disabled={file.resized} className={inter.className} onClick={() => handleClick(file.name)}>
```

And add the `handleClick` method below the `handleSubmit` method.

```ts title="pages/index.tsx"
async function handleClick(name: string) {
  await fetch(`/api/resize?name=${name}`, { method: "POST" });
}
```

Now if you head over to your app, click _Resize_, wait for a second and refresh the page; you should see that the image has been marked as _Resized_!

![Next.js SST SNS update](/img/quick-start/nextjs-sst-sns-update.png)

---

---

---

---

---

## 0. Prerequisites

SST is built with Node, so make sure your local machine has it installed; at least [Node.js 16](https://nodejs.org/) and [npm 7](https://www.npmjs.com/).

### AWS credentials

You also need to have an AWS account and AWS credentials configured locally. If you haven't already, [**follow these steps**](advanced/iam-credentials.md#loading-from-a-file).

---

## 1. Create a new app

Create a new SST app using the [`create-sst`](packages/create-sst.md) CLI.

<MultiPackagerCode>
<TabItem value="npm">

```bash
npx create-sst@latest my-sst-app
```

</TabItem>
<TabItem value="yarn">

```bash
yarn create sst my-sst-app
```

</TabItem>
<TabItem value="pnpm">

```bash
pnpm create sst my-sst-app
```

</TabItem>
</MultiPackagerCode>

### Install dependencies

Next install the dependencies.

<MultiPackagerCode>
<TabItem value="npm">

```bash
cd my-sst-app
npm install
```

</TabItem>
<TabItem value="yarn">

```bash
cd my-sst-app
yarn
```

</TabItem>
<TabItem value="pnpm">

```bash
cd my-sst-app
pnpm install
```

</TabItem>
</MultiPackagerCode>

---

## 2. Start local environment

Then start the [Live Lambda](live-lambda-development.md) local development environment.

<MultiPackagerCode>
<TabItem value="npm">

```bash
npx sst dev
```

</TabItem>
<TabItem value="yarn">

```bash
yarn sst dev
```

</TabItem>
<TabItem value="pnpm">

```bash
pnpm sst dev
```

</TabItem>
</MultiPackagerCode>

The first time you run this command in a project, you'll be prompted to enter a default stage name to use.

---

### Pick a stage

SST uses the stage names to namespace your resources.

```
Look like you’re running sst for the first time in this directory. Please enter
a stage name you’d like to use locally. Or hit enter to use the one based on
your AWS credentials (Jay):
```

Just hit **Enter** to select the default one.

<details>
<summary>Behind the scenes</summary>

The name spaced resources lets SST deploy multiple environments of the same app to the same AWS account. So you and your teammates can work together.

The stage name will be stored locally in a `.sst/` directory. It's automatically ignored from Git.

</details>

The initial deploy can take a few minutes. It will deploy your app to AWS, and also setup the infrastructure to support your local development environment.

Once complete, you'll see something like this.

```
➜  App:     my-sst-app
   Stage:   Jay
   Console: https://console.sst.dev/my-sst-app/Jay/local

✔  Deployed:
   API
   ApiEndpoint: https://bmodl6wkkj.execute-api.us-east-1.amazonaws.com
```

Now our app has been **deployed** to **AWS** and it's **connected** to our **local machine**!

---

### Open the console

The `sst dev` command also powers a web based dashboard, called the [SST Console](console.md). Head over to the URL above or simply — **<ConsoleUrl url={config.console} />**

Select the **API** tab on the left, and click **Send**. This will make a request to the endpoint in AWS.

![SST Console API tab](/img/quick-start/sst-console-api.png)

You should see a `Hello world` message in the response.

---

## 3. Make a change

Let's make a change to our API and see what the workflow is like. Replace the following in `packages/functions/src/lambda.ts`.

```diff title="packages/functions/src/lambda.ts" {3-4}
export const handler = ApiHandler(async (_evt) => {
  return {
-   body: `Hello world. The time is ${Time.now()}`,
+   body: "This is my awesome API!",
  };
});
```

Switch back to the SST Console, and click **Send** again.

![SST Console API tab](/img/quick-start/sst-console-api-after-change.png)

You should see the updated message in the response.

---

## 4. Deploy to prod

Once you are done working on your app locally, you are ready to go to production. We'll use the `sst deploy` command for this.

We don't want to use the same _stage_ as our local environment since we want to separate our dev and prod environments. So we'll run the `sst deploy` command with the `--stage` option.

<MultiPackagerCode>
<TabItem value="npm">

```bash
npx sst deploy --stage prod
```

</TabItem>
<TabItem value="yarn">

```bash
yarn sst deploy --stage prod
```

</TabItem>
<TabItem value="pnpm">

```bash
pnpm sst deploy --stage prod
```

</TabItem>
</MultiPackagerCode>

This will take a few minutes to run and will create a complete new version of your app. Once complete you'll notice these outputs.

```bash {3}
✔  Deployed:
   API
   ApiEndpoint: https://2q0mwp6r8d.execute-api.us-east-1.amazonaws.com
```

You'll notice this is a completely new API endpoint.

You can also add [**custom domains**](constructs/Api.md#custom-domains) to your app, but we'll cover that in a separate tutorial.

---

## 5. Remove the app

Finally to wrap this up, you can remove all your app all its resources from AWS.

<MultiPackagerCode>
<TabItem value="npm">

```bash
npx sst remove
npx sst remove --stage prod
```

</TabItem>
<TabItem value="yarn">

```bash
yarn sst remove
yarn sst remove --stage prod
```

</TabItem>
<TabItem value="pnpm">

```bash
pnpm sst remove
pnpm sst remove --stage prod
```

</TabItem>
</MultiPackagerCode>

This removes the local and prod environments of your app.

---

## 6. Next steps

If you are ready to dive into the details of SST, [**check out our tutorial**](learn/index.md).
