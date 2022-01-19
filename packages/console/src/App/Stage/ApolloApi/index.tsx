import { useEffect } from 'react';
import { Link } from "react-router-dom";
import { Badge, Row, Table } from "~/components";
import { styled } from "~/stitches.config";
import { H1, H3 } from "../components";

const Root = styled("div", {
  display: "flex",
  height: "100%",
});

const Explorer = styled("iframe", {
  height: "100%",
  width: "100%",
  overflow: "hidden",
});

export function ApolloApi() {
  return (
    <Root>
      <Explorer id='embedded-explorer' src="/graphql-playground.html"></Explorer>
    </Root>
  );
}
