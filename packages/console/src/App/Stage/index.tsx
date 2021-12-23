import { Route, Routes } from "react-router-dom";
import { styled } from "~/stitches.config";
import { Functions } from "./Functions";
import { Header } from "./Header";
import { Stacks } from "./Stacks";
import { Panel } from "./Panel";
import { Cognito } from "./Cognito";
import { useStacks } from "~/data/aws";
import { Local } from "./Local";
import { Button, Row, Spacer, Spinner, Splash, Toast } from "~/components";
import { useRealtimeState } from "~/data/global";
import { trpc } from "~/data/trpc";

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
  if (!stacks.isSuccess) return <Splash />;
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
      <Toast.Root>
        <StacksToasts />
      </Toast.Root>
    </Root>
  );
}

function StacksToasts() {
  const [state] = useRealtimeState();
  const status = state.stacks.status;
  const deploy = trpc.useMutation("deploy");

  if (["building", "synthing"].includes(status))
    return (
      <Toast.Card color="neutral">
        <Row alignHorizontal="justify" alignVertical="center">
          <Toast.Title>Stacks building</Toast.Title>
          <Spacer horizontal="md" />
          <Spinner />
        </Row>
      </Toast.Card>
    );
  if (["deploying"].includes(status))
    return (
      <Toast.Card color="neutral">
        <Row alignHorizontal="justify" alignVertical="center">
          <Toast.Title>Stacks deploying</Toast.Title>
          <Spacer horizontal="md" />
          <Spinner />
        </Row>
      </Toast.Card>
    );
  if (status === "deployable")
    return (
      <Toast.Card color="neutral">
        <Row alignHorizontal="justify" alignVertical="center">
          <Toast.Title>There are pending stacks changes</Toast.Title>
          <Spacer horizontal="md" />
          <Button onClick={() => deploy.mutate()}>Deploy</Button>
        </Row>
      </Toast.Card>
    );
  if (status.failed)
    return (
      <Toast.Card color="danger">
        <Toast.Title>Stacks failed to build</Toast.Title>
      </Toast.Card>
    );

  return null;
}
