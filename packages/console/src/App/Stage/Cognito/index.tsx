import { useEffect } from "react";
import { Route, Routes, useNavigate, useParams } from "react-router-dom";
import { Table } from "~/components";
import { Stack } from "~/components/Stack";
import { useUsersQuery } from "~/data/aws";
import { useConstructsByType, useConstruct } from "~/data/aws/stacks";
import { styled } from "~/stitches.config";
import { H1 } from "../components";

const Root = styled("div", {
  padding: "$xl",
  overflow: "hidden",
});

export function Cognito() {
  return (
    <Root>
      <Routes>
        <Route path=":stack/:auth" element={<Detail />} />
        <Route path="*" element={<List />} />
      </Routes>
    </Root>
  );
}

export function List() {
  const navigate = useNavigate();
  const auths = useConstructsByType("Auth")!;

  useEffect(() => {
    if (auths.length !== 1) return;
    const [auth] = auths;
    navigate(`${auth.stack}/${auth.addr}`);
  }, [auths]);
  return <span />;
}

export function Detail() {
  const params = useParams<{ stack: string; auth: string }>();
  const auth = useConstruct("Auth", params.stack!, params.auth!);

  const users = useUsersQuery(auth.data.userPoolId!);
  return (
    <Stack space="xl">
      <H1>Cognito / {auth.data.userPoolId}</H1>
      <Table.Root>
        <Table.Head>
          <Table.Row>
            <Table.Header>Username</Table.Header>
            <Table.Header>Email</Table.Header>
            <Table.Header>Enabled</Table.Header>
            <Table.Header>Status</Table.Header>
            <Table.Header>Created</Table.Header>
          </Table.Row>
        </Table.Head>

        <Table.Body>
          {users.data?.pages[0]?.Users?.map((u) => (
            <Table.Row>
              <Table.Cell>{u.Username}</Table.Cell>
              <Table.Cell>
                {u.Attributes?.find((x) => x.Name === "email")?.Value}
              </Table.Cell>
              <Table.Cell>{u.Enabled?.toString()}</Table.Cell>
              <Table.Cell>{u.UserStatus}</Table.Cell>
              <Table.Cell>{u.UserCreateDate?.toISOString()}</Table.Cell>
            </Table.Row>
          ))}
        </Table.Body>
      </Table.Root>
    </Stack>
  );
}
