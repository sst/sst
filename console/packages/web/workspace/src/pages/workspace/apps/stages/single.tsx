import { styled } from "@macaron-css/solid";
import { Button } from "../../../../ui/button";
import { theme } from "../../../../ui/theme";

const Root = styled("div", {
  base: {
    position: "fixed",
    inset: 0,
    display: "flex",
  },
});

const Sidebar = styled("div", {
  base: {
    width: "240px",
    flexShrink: 0,
    borderRight: "1px solid hsl(240deg 28% 14% / 8%)",
  },
});

const SidebarHeader = styled("div", {
  base: {
    padding: theme.space[4],
  },
});

const SidebarAvatar = styled("div", {
  base: {
    width: 36,
    aspectRatio: "1/1",
    background: "black",
    borderRadius: 4,
  },
});
export function Single() {
  return (
    <Root>
      <Sidebar>
        <SidebarHeader>
          <SidebarAvatar />
        </SidebarHeader>
      </Sidebar>
      <div>
        <Button color="danger">Delete</Button>
      </div>
    </Root>
  );
}
