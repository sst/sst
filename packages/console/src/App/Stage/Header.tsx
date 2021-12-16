import { Logo } from "~/components";
import { Stack } from "~/components/Stack";
import { styled } from "~/stitches.config";
import { useParams } from "react-router-dom";
import { useDarkMode } from "~/data/global";

const Root = styled("div", {
  flexShrink: 0,
  display: "flex",
  alignItems: "center",
  height: "70px",
  paddingLeft: "$xl",
  borderBottom: "1px solid $border",
});

const Navigation = styled("nav", {
  flexGrow: 1,
});

const Stage = styled("div", {
  paddingLeft: "$xl",
  paddingRight: "$xxl",
  height: "100%",
  fontSize: "$md",
  color: "white",
  background: "$highlight",
  display: "flex",
  alignItems: "center",
});

const StageName = styled("div", {
  fontWeight: 600,
});
const StageApp = styled("div", {
  fontSize: "$sm",
  fontWeight: 500,
});

export function Header() {
  const params = useParams<{
    stage: string;
    app: string;
  }>();
  const dm = useDarkMode();
  return (
    <Root>
      <Logo height={35} onClick={() => dm.toggle()} />
      <Navigation />
      <Stage>
        <Stack space="xxs">
          <StageName>{params.stage}</StageName>
          <StageApp>{params.app}</StageApp>
        </Stack>
      </Stage>
    </Root>
  );
}
