# svelte-kit-sst

This adapter allows SvelteKit to deploy your SSR site to [AWS](https://aws.amazon.com/).

## Installation

Install the adapter to your project’s dependencies using your preferred package manager. If you’re using npm or aren’t sure, run this in the terminal:

```bash
  npm install svelte-kit-sst
```

Add the adapter in your `svelte.config.js` file.

```diff
+ import adapter from "svelte-kit-sst";
  import { vitePreprocess } from "@sveltejs/kit/vite";

  const config = {
    preprocess: vitePreprocess(),
    kit: {
+     adapter: adapter(),
    },
  };

  export default config;
```
