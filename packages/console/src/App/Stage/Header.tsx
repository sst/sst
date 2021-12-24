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
  padding: "0 $xl",
  height: "100%",
  fontSize: "$md",
  color: "white",
  background: "$highlight",
  display: "flex",
  alignItems: "center",
  fontWeight: 600,
});

export function Header() {
  const params = useParams<{
    stage: string;
    app: string;
  }>();
  const dm = useDarkMode();
  return (
    <Root>
      <Logo
        style={{ transform: "scale(0.4)", transformOrigin: "0 center" }}
        onClick={() => dm.toggle()}
      />
      <Navigation />
      <Stage>
        {params.app} / {params.stage}
      </Stage>
    </Root>
  );
}
