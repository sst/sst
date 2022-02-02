import { UserType } from "@aws-sdk/client-cognito-identity-provider";
import { useEffect, useState } from "react";
import {
  Navigate,
  Route,
  Routes,
  useNavigate,
  useParams,
} from "react-router-dom";
import { Badge, Button, DropdownMenu, Table } from "~/components";
import { useUsersQuery } from "~/data/aws";
import {
  useConstructsByType,
  useConstruct,
  useStacks,
} from "~/data/aws/stacks";
import { styled } from "~/stitches.config";
import {
  H2,
  Header,
  HeaderTitle,
  HeaderSwitcher,
  HeaderSwitcherItem,
  HeaderSwitcherLabel,
  HeaderGroup,
} from "../components";

const Root = styled("div", {
  display: "flex",
  flexDirection: "column",
  height: "100%",
});

export function Cognito() {
  const auths = useConstructsByType("Auth")!;
  const navigate = useNavigate();

  useEffect(() => {
    if (auths.length === 0) return;
    const [auth] = auths;
    navigate(`${auth.stack}/${auth.addr}`);
  }, [auths]);

  return (
    <Root>
      <Routes>
        <Route path=":stack/:addr/*" element={<Explorer />} />
        <Route path="*" element={<Explorer />} />
      </Routes>
    </Root>
  );
}

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

export function Explorer() {
  const stacks = useStacks();
  const params = useParams<{ stack: string; addr: string }>();
  const auths = stacks?.data?.constructs.byType["Auth"] || [];
  const auth = useConstruct("Auth", params.stack!, params.addr!);
  const users = useUsersQuery(auth?.data.userPoolId!);

  const [editing, setEditing] = useState<UserType | undefined>();

  if (auths.length > 0 && !auth)
    return <Navigate to={`${auths[0].stack}/${auths[0].addr}`} />;

  return (
    <>
      <Header>
        <HeaderTitle>Cognito</HeaderTitle>
        <HeaderGroup>
          <HeaderSwitcher value={`${auth.stack} / ${auth.id}`}>
            {stacks.data?.all
              .filter((s) => s.constructs.byType.Auth?.length || 0 > 0)
              .map((stack) => (
                <>
                  <HeaderSwitcherLabel>
                    {stack.info.StackName}
                  </HeaderSwitcherLabel>
                  {stack.constructs.byType.Auth!.map((auth) => (
                    <HeaderSwitcherItem to={`../${auth.stack}/${auth.addr}`}>
                      {auth.id}
                    </HeaderSwitcherItem>
                  ))}
                </>
              ))}
          </HeaderSwitcher>
          <Button color="accent">Create User</Button>
        </HeaderGroup>
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
