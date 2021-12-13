import { useEffect } from "react";
import { Route, Routes, useParams } from "react-router-dom";
import { useMetadataQuery, useStacksQuery } from "~/data/aws/stacks";
import { styled } from "~/stitches.config";
import { Functions } from "./Functions";
import { Panel } from "./Panel";

const Root = styled("div", {
  background: "$loContrast",
  display: "flex",
  position: "absolute",
  left: "0",
  right: "0",
  top: "0",
  bottom: "0",
  color: "$hiContrast",
});

const Content = styled("div", {
  flexGrow: 1,
  padding: "$xl",
});

export function Stage() {
  const stacks = useStacksQuery();
  if (stacks.isError) return <span>Auth Failed</span>;
  if (stacks.isLoading) return <span>Loading...</span>;
  return (
    <Root>
      <Panel />
      <Content>
        <Routes>
          <Route path="functions" element={<Functions />} />
        </Routes>
      </Content>
    </Root>
  );
}
