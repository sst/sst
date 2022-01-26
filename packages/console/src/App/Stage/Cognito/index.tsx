import { UserType } from "@aws-sdk/client-cognito-identity-provider";
import { useEffect, useState } from "react";
import { Route, Routes, useNavigate, useParams } from "react-router-dom";
import { Badge, Table } from "~/components";
import { Stack } from "~/components/Stack";
import { useUsersQuery } from "~/data/aws";
import { useConstructsByType, useConstruct } from "~/data/aws/stacks";
import { styled } from "~/stitches.config";
import { H1, H2 } from "../components";

const Root = styled("div", {
  display: "flex",
  flexDirection: "column",
  height: "100%",
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
    if (auths.length === 0) return;
    const [auth] = auths;
    navigate(`${auth.stack}/${auth.addr}`);
  }, [auths]);
  return <span />;
}

const Header = styled("div", {
  height: 70,
  padding: "0 $lg",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  borderBottom: "1px solid $border",
  flexShrink: 0,
});

const HeaderPool = styled("div", {
  fontWeight: 500,
});

const Content = styled("div", {
  flexGrow: 1,
  display: "flex",
});

const Editor = styled("div", {
  padding: "$xl",
  borderLeft: "1px solid $border",
  width: 500,
  flexShrink: 0,
});

const TableScroller = styled("div", {
  overflowX: "auto",
  flexGrow: 1,
});

export function Detail() {
  const params = useParams<{ stack: string; auth: string }>();
  const auth = useConstruct("Auth", params.stack!, params.auth!);
  const users = useUsersQuery(auth.data.userPoolId!);

  const [editing, setEditing] = useState<UserType | undefined>();

  return (
    <>
      <Header>
        <HeaderPool>cognito / {auth.data.userPoolId}</HeaderPool>
      </Header>
      <Content>
        <TableScroller onClick={() => setEditing(undefined)}>
          <Table.Root flush>
            <Table.Head>
              <Table.Row>
                <Table.Header>Email</Table.Header>
                <Table.Header>Sub</Table.Header>
                <Table.Header>Enabled</Table.Header>
                <Table.Header>Status</Table.Header>
                <Table.Header>Created</Table.Header>
              </Table.Row>
            </Table.Head>

            <Table.Body>
              {users.data?.pages[0]?.Users?.map((u) => (
                <Table.Row>
                  <Table.Cell>
                    {u.Attributes?.find((x) => x.Name === "email")?.Value}
                  </Table.Cell>
                  <Table.Cell>{u.Username}</Table.Cell>
                  <Table.Cell>{u.Enabled?.toString()}</Table.Cell>
                  <Table.Cell>
                    <Badge
                      color={
                        u.UserStatus === "CONFIRMED" ? "success" : "neutral"
                      }
                    >
                      {u.UserStatus}
                    </Badge>
                  </Table.Cell>
                  <Table.Cell>{u.UserCreateDate?.toISOString()}</Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table.Root>
        </TableScroller>
        {editing && (
          <Editor>
            <H2>Editing {editing.Username}</H2>
          </Editor>
        )}
      </Content>
    </>
  );
}
