import { styled } from "~/stitches.config";

const Root = styled("div", {
  display: "flex",
  alignItems: "center",
  height: "60px",
  padding: "0 $xl",
  borderBottom: "1px solid $border",
});

export function Header() {
  return (
    <Root>
      <div>Hello</div>
    </Root>
  );
}
