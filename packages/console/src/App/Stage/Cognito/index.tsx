import { useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import {
  Link,
  Navigate,
  Route,
  Routes,
  useNavigate,
  useParams,
} from "react-router-dom";
import {
  Badge,
  Button,
  DropdownMenu,
  Stack,
  Table,
  useOnScreen,
} from "~/components";
import {
  useCreateUser,
  useDeleteUser,
  useUser,
  useUserPool,
  useUsersQuery,
} from "~/data/aws";
import { useConstruct, useStacks } from "~/data/aws/stacks";
import { styled } from "~/stitches.config";
import {
  Header,
  HeaderTitle,
  HeaderSwitcher,
  HeaderSwitcherItem,
  HeaderSwitcherLabel,
  HeaderGroup,
  HeaderSwitcherGroup,
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

const Pager = styled("div", {
  width: "100%",
  padding: "$sm $lg",
  fontWeight: 600,
  fontSize: "$sm",
});

const Empty = styled("div", {
  padding: "$lg",
});

export function Explorer() {
  const stacks = useStacks();
  const nav = useNavigate();
  const params = useParams<{ stack: string; addr: string; "*": string }>();
  const auths = (stacks?.data?.constructs.byType["Auth"] || []).filter(
    (item) => item.data.userPoolId
  );
  const auth = useConstruct("Auth", params.stack!, params.addr!);
  const users = useUsersQuery(auth?.data.userPoolId!);
  const loaderRef = useRef<HTMLDivElement>(null);
  const loaderVisible = useOnScreen(loaderRef);
  const userPool = useUserPool(auth?.data.userPoolId);

  useEffect(() => {
    if (loaderVisible) users.fetchNextPage();
  }, [loaderVisible]);

  if (auths.length > 0 && !auth)
    return <Navigate to={`${auths[0].stack}/${auths[0].addr}`} />;

  const showUsername = userPool.data?.UserPool?.UsernameAttributes == null;

  return (
    <Root>
      <Main>
        <Header>
          <HeaderTitle>Cognito</HeaderTitle>
          {auths.length > 0 && (
            <HeaderGroup>
              <HeaderSwitcher value={`${auth.stack} / ${auth.id}`}>
                {stacks.data?.all
                  .filter(
                    (s) =>
                      s.constructs.byType.Auth?.filter((x) => x.data.userPoolId)
                        .length || 0 > 0
                  )
                  .map((stack) => (
                    <HeaderSwitcherGroup>
                      <HeaderSwitcherLabel>
                        {stack.info.StackName}
                      </HeaderSwitcherLabel>
                      {stack.constructs.byType
                        .Auth!.filter((x) => x.data.userPoolId)
                        .map((auth) => (
                          <HeaderSwitcherItem
                            key={auth.stack + auth.addr}
                            to={`../${auth.stack}/${auth.addr}`}
                          >
                            {auth.id}
                          </HeaderSwitcherItem>
                        ))}
                    </HeaderSwitcherGroup>
                  ))}
              </HeaderSwitcher>
              <Button as={Link} to="create" color="accent">
                Create
              </Button>
            </HeaderGroup>
          )}
        </Header>
        <Content>
          {auth && (
            <>
              <Table.Root flush>
                <Table.Head>
                  <Table.Row>
                    {showUsername && <Table.Header>Username</Table.Header>}
                    <Table.Header>Email</Table.Header>
                    <Table.Header>Phone</Table.Header>
                    <Table.Header>Sub</Table.Header>
                    <Table.Header>Enabled</Table.Header>
                    <Table.Header>Status</Table.Header>
                    <Table.Header>Created</Table.Header>
                  </Table.Row>
                </Table.Head>

                <Table.Body>
                  {users.data?.pages[0]?.Users?.map((u) => (
                    <Table.Row
                      clickable
                      onClick={() => nav(u.Username!)}
                      key={u.Username!}
                    >
                      {showUsername && <Table.Cell>{u.Username}</Table.Cell>}
                      <Table.Cell>
                        {u.Attributes?.find((x) => x.Name === "email")?.Value ||
                          "No email"}
                      </Table.Cell>
                      <Table.Cell>
                        {u.Attributes?.find((x) => x.Name === "phone_number")
                          ?.Value || "No phone"}
                      </Table.Cell>
                      <Table.Cell>
                        {u.Attributes?.find((x) => x.Name === "sub")?.Value}
                      </Table.Cell>
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
                      <Table.Cell title={u.UserCreateDate?.toISOString()}>
                        {new Intl.DateTimeFormat([], {
                          dateStyle: "medium",
                          timeStyle: "short",
                        }).format(u.UserCreateDate)}
                      </Table.Cell>
                    </Table.Row>
                  ))}
                </Table.Body>
              </Table.Root>
              <Pager ref={loaderRef}>{users.isLoading ? "Loading" : ""}</Pager>
            </>
          )}
          {auths.length === 0 && <Empty>No user pools in this app</Empty>}
        </Content>
      </Main>
      <Routes>
        <Route path="create" element={<CreatePanel />} />
        <Route path=":id" element={<EditPanel showUsername={showUsername} />} />
      </Routes>
    </Root>
  );
}

const Label = styled("label", {
  fontSize: "$sm",
  fontWeight: 500,
  "& input": {
    marginTop: "$sm",
  },
});

const Input = styled("input", {
  background: "$loContrast",
  color: "$hiContrast",
  display: "block",
  width: "100%",
  height: 36,
  border: "1px solid $border",
  borderRadius: 4,
  fontFamily: "$sans",
  padding: "0 12px",
  "&:disabled": {
    background: "$loContrast",
    color: "$gray11",
  },
  "&:hover:not(:disabled)": {
    borderColor: "$gray7",
  },
  "&:focus:not(:disabled)": {
    outline: "none",
    borderColor: "$highlight",
  },
});

const Error = styled("div", {
  color: "$red9",
  fontSize: "$sm",
  lineHeight: 1.5,
});

const SidePanel = styled("div", {
  borderLeft: "1px solid $border",
  width: 400,
  flexShrink: 0,
});

const SidePanelHeader = styled("div", {
  height: 70,
  display: "flex",
  padding: "0 $lg",
  alignItems: "center",
});

const SidePanelContent = styled("div", {
  padding: "0 $lg",
});

const SidePanelToolbar = styled("div", {
  display: "flex",
  justifyContent: "end",
  row: "$md",
});

interface Form {
  name: string;
  email: string;
  password: string;
}

function CreatePanel() {
  const params = useParams<{ stack: string; addr: string }>();
  const auth = useConstruct("Auth", params.stack!, params.addr!);
  const form = useForm();
  const createUser = useCreateUser();
  const navigate = useNavigate();
  const onSubmit = form.handleSubmit(async (data: Form) => {
    await createUser.mutateAsync({
      pool: auth.data.userPoolId!,
      ...data,
    });
    navigate("../");
  });
  return (
    <SidePanel>
      <SidePanelHeader>
        <HeaderTitle>Create User</HeaderTitle>
      </SidePanelHeader>
      <SidePanelContent>
        <form onSubmit={onSubmit} autoComplete="off">
          <Stack space="lg">
            <Label>
              Username
              <Input
                autoComplete="off"
                autoFocus
                type="text"
                placeholder="Username"
                {...form.register("email")}
              />
            </Label>
            <Label>
              Password
              <Input
                autoComplete="off"
                type="password"
                placeholder="Password"
                {...form.register("password")}
              />
            </Label>
            {/*
            <Label>
              Phone Number (optional)
              <Input
                type="text"
                placeholder="Phone Number"
                {...form.register("phone")}
              />
            </Label>
            */}
            {createUser.error && (
              <Error>{(createUser.error as any).message}</Error>
            )}
            <SidePanelToolbar>
              <Button as={Link} replace to="../" color="accent">
                Cancel
              </Button>
              <Button type="submit">Create</Button>
            </SidePanelToolbar>
          </Stack>
        </form>
      </SidePanelContent>
    </SidePanel>
  );
}

type EditPanelProps = {
  showUsername: boolean;
};

function EditPanel(props: EditPanelProps) {
  const params = useParams<{ stack: string; addr: string; id: string }>();
  const auth = useConstruct("Auth", params.stack!, params.addr!);
  const user = useUser(auth.data.userPoolId!, params.id!);
  const deleteUser = useDeleteUser();
  const nav = useNavigate();

  if (!user) return <span>"Cannot find user"</span>;

  const sub = user.Attributes?.find((x) => x.Name === "sub")?.Value;
  const email = user.Attributes?.find((x) => x.Name === "email")?.Value;
  const phone = user.Attributes?.find((x) => x.Name === "phone_number")?.Value;

  return (
    <SidePanel>
      <SidePanelHeader>
        <HeaderTitle>Edit User</HeaderTitle>
      </SidePanelHeader>
      <SidePanelContent>
        <Stack space="lg">
          <fieldset disabled>
            <Stack space="lg">
              {props.showUsername && (
                <Label>
                  Username
                  <Input readOnly value={user.Username} />
                </Label>
              )}
              {email && (
                <Label>
                  Email
                  <Input readOnly value={email} />
                </Label>
              )}
              <Label>
                Sub
                <Input readOnly value={sub} />
              </Label>
              {phone && (
                <Label>
                  Phone Number (optional)
                  <Input readOnly value={phone} />
                </Label>
              )}
            </Stack>
          </fieldset>
          <SidePanelToolbar>
            <Button
              as={Link}
              replace
              to="../"
              color="accent"
              onClick={() => {}}
            >
              Cancel
            </Button>
            <Button
              color="danger"
              onClick={() =>
                deleteUser.mutateAsync(
                  {
                    pool: auth.data.userPoolId!,
                    id: params.id!,
                  },
                  {
                    onSuccess: () => nav("../"),
                  }
                )
              }
            >
              Delete
            </Button>
          </SidePanelToolbar>
        </Stack>
      </SidePanelContent>
    </SidePanel>
  );
}
