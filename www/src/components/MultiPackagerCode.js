import React from "react";
import Tabs from "@theme/Tabs";

export default function MultiPackagerCode(props) {
  return (
    <Tabs
      groupId="code-snippets"
      defaultValue="npm"
      values={[
        { label: "npm", value: "npm" },
        { label: "yarn", value: "yarn" },
      ]}
    >
      {props.children}
    </Tabs>
  );
}