---
description: "Snippets for the sst.DebugApp construct"
---

import TabItem from "@theme/TabItem";
import MultiLanguageCode from "@site/src/components/MultiLanguageCode";

## Accessing app properties

The properties of the app can be accessed in the `stacks/index.js` as:

```js
export function debugApp(app) {
  app.name;
  app.stage;
  app.region;
  app.account;
}
```
