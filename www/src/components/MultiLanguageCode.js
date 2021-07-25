import React from "react";
import Tabs from "@theme/Tabs";

export default function MultiLanguageCode(props) {
  return (
    <Tabs
      groupId="code-snippets"
      defaultValue="js"
      values={[
        { label: "JavaScript", value: "js" },
        { label: "TypeScript", value: "ts" },
      ]}
    >
      {props.children}
    </Tabs>
  );
}
