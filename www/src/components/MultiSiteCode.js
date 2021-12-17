import React from "react";
import Tabs from "@theme/Tabs";

export default function MultiSiteCode(props) {
  return (
    <Tabs
      groupId="code-snippets"
      defaultValue="react"
      values={[
        { label: "ReactStaticSite", value: "react" },
        { label: "NextjsSite", value: "next" },
        { label: "StaticSite", value: "static" },
      ]}
    >
      {props.children}
    </Tabs>
  );
}
