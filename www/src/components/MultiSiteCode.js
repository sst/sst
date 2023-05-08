import React from "react";
import Tabs from "@theme/Tabs";

export default function MultiSiteCode(props) {
  return (
    <Tabs
      groupId="code-snippets"
      defaultValue="react"
      values={[
        { label: "NextjsSite", value: "next" },
        { label: "StaticSite", value: "static" },
      ]}
    >
      {props.children}
    </Tabs>
  );
}
