import { Navigate, Route, Routes } from "react-router-dom";
import { styled } from "~/stitches.config";
import { Functions } from "./Functions";
import { Stacks } from "./Stacks";
import { Panel } from "./Panel";
import { Cognito } from "./Cognito";
import { Buckets } from "./Buckets";
import { useStacks } from "~/data/aws";
import { Local } from "./Local";
import { Anchor, Spacer, Spinner, Splash, Toast } from "~/components";
import { useRealtimeState } from "~/data/global";
import { trpc } from "~/data/trpc";
import { useEffect, useRef } from "react";
import { RDS } from "./RDS";
import { GraphQL } from "./GraphQL";
import { Dynamo } from "./Dynamo";
import { Api } from "./Api";

const Root = styled("div", {
  background: "$loContrast",
  display: "flex",
  flexDirection: "column",
  position: "fixed",
  inset: 0,
  color: "$hiContrast",
});

const Announcement = styled("div", {
  borderBottom: "1px solid $border",
  padding: "12px 10px 14px",
  fontSize: 14,
  textAlign: "center",
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
  if (stacks.isLoading) return <Splash spinner>Syncing metadata</Splash>;
  if (!stacks.isSuccess) return <Splash>Error fetching metadata</Splash>;
  if (!stacks.data.all.length)
    return (
      <Splash>
        No stacks found for app {stacks.data.app} and stage {stacks.data.stage}
      </Splash>
    );
  return (
    <Root>
      <Announcement>
        Check out the{" "}
        <a href="https://console.sst.dev" target="_blank">
          new SST Console
        </a>
        . We'll be migrating to it in the coming weeks.{" "}
      </Announcement>
      <Fill>
        <Panel />
        <Content>
          <Routes>
            <Route path="local/*" element={<Local />} />
            <Route path="stacks/*" element={<Stacks />} />
            <Route path="functions/*" element={<Functions />} />
            <Route path="cognito/*" element={<Cognito />} />
            <Route path="buckets/*" element={<Buckets />} />
            <Route path="rds/*" element={<RDS />} />
            <Route path="graphql/*" element={<GraphQL />} />
            <Route path="dynamodb/*" element={<Dynamo />} />
            <Route path="api/*" element={<Api />} />
            <Route path="*" element={<Navigate to="./local" />} />
          </Routes>
        </Content>
      </Fill>
      <Toast.Provider>
        <StacksToasts />
      </Toast.Provider>
    </Root>
  );
}

function StacksToasts() {
  const stacks = useStacks();
  const status = useRealtimeState((s) => s.stacks.status);
  const deploy = trpc.useMutation("deploy");
  const toast = Toast.use();

  const skip = useRef(false);
  useEffect(() => {
    if (!skip.current) {
      skip.current = true;
      return;
    }
    if (status.idle === "deployed") {
      toast.create({
        type: "success",
        text: "Stacks deployed successfully",
      });
      stacks.refetch();
    }

    if (status.idle === "unchanged")
      toast.create({
        type: "neutral",
        text: "No stacks changes detected",
      });
  }, [status]);

  if (status === "building")
    return (
      <Toast.Simple type="neutral">
        Building stacks
        <Spacer horizontal="md" />
        <Spinner size="sm" />
      </Toast.Simple>
    );
  if (status === "synthing")
    return (
      <Toast.Simple type="neutral">
        Synthesizing stacks
        <Spacer horizontal="md" />
        <Spinner size="sm" />
      </Toast.Simple>
    );
  if (status === "deploying")
    return (
      <Toast.Simple type="neutral">
        Deploying stacks
        <Spacer horizontal="md" />
        <Spinner size="sm" />
      </Toast.Simple>
    );
  if (status === "deployable")
    return (
      <Toast.Simple type="neutral">
        Pending stacks changes
        <Spacer horizontal="md" />
        <Anchor color="highlight" onClick={() => deploy.mutate()}>
          Deploy
        </Anchor>
      </Toast.Simple>
    );
  if (status.failed === "build")
    return <Toast.Simple type="danger">Stacks failed to build</Toast.Simple>;
  if (status.failed === "deploy")
    return <Toast.Simple type="danger">Stacks failed to deploy</Toast.Simple>;
  if (status.failed === "synth")
    return (
      <Toast.Simple type="danger">Stacks failed to synthesize</Toast.Simple>
    );

  return null;
}
