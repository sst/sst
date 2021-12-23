import { styled } from "~/stitches.config";
import { Logo } from "./Logo";
import { Stack } from "./Stack";

const SplashRoot = styled("div", {
  position: "absolute",
  left: 0,
  right: 0,
  bottom: 0,
  top: 0,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "$sm",
});

export function Splash(_props: React.PropsWithChildren<{}>) {
  return (
    <SplashRoot>
      <Stack space="sm">
        <Logo width={200} />
      </Stack>
    </SplashRoot>
  );
}
