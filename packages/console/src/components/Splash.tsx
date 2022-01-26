import { styled } from "~/stitches.config";
import { Logo } from "./Logo";
import { Row } from "./Row";
import { Spacer } from "./Spacer";
import { Spinner } from "./Spinner";
import { Stack } from "./Stack";

const Root = styled("div", {
  position: "absolute",
  left: 0,
  right: 0,
  bottom: 0,
  top: 0,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  background: "$loContrast",
});

const Content = styled("div", {
  padding: "$md $lg",
  fontSize: "$md",
  borderRadius: 8,
  background: "$orange3",
  color: "$orange12",
  lineHeight: 2,
});

export function Splash(
  props: React.PropsWithChildren<{
    spinner?: boolean;
  }>
) {
  return (
    <Root>
      <Stack alignHorizontal="center" space="md">
        <Logo width={150} />
        {props.children && (
          <Content>
            <Row alignVertical="center">
              <span>{props.children}</span>
              {props.spinner && (
                <>
                  <Spacer horizontal="md" />
                  <Spinner />
                </>
              )}
            </Row>
          </Content>
        )}
      </Stack>
    </Root>
  );
}

export function EmptyState(props: React.PropsWithChildren<{}>) {
  return (
    <Content>
      <Row alignVertical="center">
        <span>{props.children}</span>
        <Spacer horizontal="md" />
        <Spinner />
      </Row>
    </Content>
  );
}
