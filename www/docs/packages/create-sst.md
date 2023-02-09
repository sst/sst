---
title: create-sst
description: "Reference docs for the create-sst CLI."
---

import MultiPackagerCode from "@site/src/components/MultiPackagerCode";
import TabItem from "@theme/TabItem";
import HeadlineText from "@site/src/components/HeadlineText";

<HeadlineText>

A simple CLI that sets up a modern web application powered by SST.

</HeadlineText>

---

## Usage

There's no need to install this CLI. Just use it directly to create your projects.

<MultiPackagerCode>
<TabItem value="npm">

```bash
npx create-sst@latest
```

</TabItem>
<TabItem value="yarn">

```bash
yarn create sst
```

</TabItem>
<TabItem value="pnpm">

```bash
pnpm create sst
```

</TabItem>
</MultiPackagerCode>

This will prompt you for the database option and a folder name. And it will bootstrap the application in that directory.

## Options

Pass in the following (optional) options.

### `--template`

Instead of the standard starter, you can choose to use one of our minimal setups or examples as the template to bootstrap.

```bash
npx create-sst@latest --template=other/go
```

## Arguments

### `<destination>`

Specify a destination directory instead of typing it into the interactive prompt

```bash
npx create-sst@latest my-sst-app
```

Note that extra `--` when using `npm init`.
