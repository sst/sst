import { Route, Routes } from "react-router-dom";
import { styled } from "~/stitches.config";
import { Functions } from "./Functions";
import { Header } from "./Header";
import { Stacks } from "./Stacks";
import { Panel } from "./Panel";
import { Cognito } from "./Cognito";
import { useStacks } from "~/data/aws";
import { Local } from "./Local";

const Root = styled("div", {
  background: "$loContrast",
  display: "flex",
  flexDirection: "column",
  position: "absolute",
  left: "0",
  right: "0",
  top: "0",
  bottom: "0",
  color: "$hiContrast",
});

const Fill = styled("div", {
  display: "flex",
  flexGrow: 1,
  overflow: "hidden",
});

const Content = styled("div", {
  flexGrow: 1,
  height: "100%",
  overflow: "auto",
});

export function Stage() {
  const stacks = useStacks();
  if (stacks.isError) return <span>App Load Failed</span>;
  if (stacks.isLoading) return <span>Loading...</span>;
  return (
    <Root>
      <Header />
      <Fill>
        <Panel />
        <Content>
          <Routes>
            <Route path="local/*" element={<Local />} />
            <Route path="stacks/*" element={<Stacks />} />
            <Route path="functions/*" element={<Functions />} />
            <Route path="cognito/*" element={<Cognito />} />
          </Routes>
        </Content>
      </Fill>
    </Root>
  );
}
