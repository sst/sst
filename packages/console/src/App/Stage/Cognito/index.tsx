import { UserType } from "@aws-sdk/client-cognito-identity-provider";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import {
  Link,
  Navigate,
  NavLink,
  Route,
  Routes,
  useNavigate,
  useParams,
} from "react-router-dom";
import { Badge, Button, Stack, Table } from "~/components";
import { useCreateUser, useUsersQuery } from "~/data/aws";
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

export function Cognito() {
  return (
    <Routes>
      <Route path=":stack/:addr/*" element={<Explorer />} />
      <Route path="*" element={<Explorer />} />
    </Routes>
  );
}

const Root = styled("div", {
  display: "flex",
  height: "100%",
  width: "100%",
  overflow: "hidden",
});

const Main = styled("div", {
  display: "flex",
  flexDirection: "column",
  flexGrow: 1,
  height: "100%",
  overflow: "hidden",
});

const Content = styled("div", {
  overflow: "auto",
  flexGrow: 1,
});

export function Explorer() {
  const stacks = useStacks();
  const params = useParams<{ stack: string; addr: string }>();
  const auths = stacks?.data?.constructs.byType["Auth"] || [];
  const auth = useConstruct("Auth", params.stack!, params.addr!);
  const users = useUsersQuery(auth?.data.userPoolId!);
  console.log(auths, auth);

  if (auths.length > 0 && !auth)
    return <Navigate to={`${auths[0].stack}/${auths[0].addr}`} />;

  return (
    <Root>
      <Main>
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
            <Button as={Link} to="create" color="accent">
              Create User
            </Button>
          </HeaderGroup>
        </Header>
        <Content>
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
        </Content>
      </Main>
      <Routes>
        <Route path="create" element={<CreateEditor />} />
      </Routes>
    </Root>
  );
}

const Group = styled("fieldset", {});

const Label = styled("label", {
  fontSize: "$sm",
  fontWeight: 500,
  "& input": {
    marginTop: "$sm",
  },
});

const Input = styled("input", {
  display: "block",
  width: "100%",
  height: 36,
  border: "1px solid $border",
  borderRadius: 4,
  fontFamily: "$sans",
  padding: "0 12px",
  "&:hover": {
    borderColor: "$gray7",
  },
  "&:focus": {
    outline: "none",
    borderColor: "$highlight",
  },
});

const Editor = styled("div", {
  borderLeft: "1px solid $border",
  width: 400,
  flexShrink: 0,
});

const EditorHeader = styled("div", {
  height: 70,
  display: "flex",
  padding: "0 $lg",
  alignItems: "center",
});

const EditorContent = styled("div", {
  padding: "0 $lg",
});

const EditorToolbar = styled("div", {
  display: "flex",
  justifyContent: "end",
  row: "$md",
});

interface Form {
  name: string;
  email: string;
  password: string;
}

function CreateEditor() {
  const params = useParams<{ stack: string; addr: string }>();
  const auth = useConstruct("Auth", params.stack!, params.addr!);
  const form = useForm();
  const createUser = useCreateUser();
  const onSubmit = form.handleSubmit(async (data: Form) => {
    createUser.mutate({
      pool: auth.data.userPoolId!,
      email: data.email,
    });
    console.log(data);
  });
  return (
    <Editor>
      <EditorHeader>
        <HeaderTitle>Create User</HeaderTitle>
      </EditorHeader>
      <EditorContent>
        <form onSubmit={onSubmit}>
          <Stack space="lg">
            <Label>
              Email
              <Input
                autoFocus
                type="email"
                placeholder="Email Address"
                {...form.register("email")}
              />
            </Label>
            <Label>
              Phone Number (optional)
              <Input
                type="tel"
                placeholder="Phone Number"
                {...form.register("phone")}
              />
            </Label>
            <EditorToolbar>
              <Button as={Link} replace to="../" color="accent">
                Cancel
              </Button>
              <Button type="submit">Create</Button>
            </EditorToolbar>
          </Stack>
        </form>
      </EditorContent>
    </Editor>
  );
}
