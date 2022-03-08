import { Stack } from "~/components";
import { styled } from "~/stitches.config";

type IssuesProps = {
  // TODO: Figure this out
  issues: any[];
  compact?: boolean;
};

const Root = styled("div", {
  fontSize: "$sm",
  background: "$border",
  color: "$hiContrast",
  lineHeight: 2,
  variants: {
    compact: {
      true: {
        padding: "$sm $md",
        borderRadius: 6,
      },
      false: {
        padding: "$lg $xl",
      },
    },
  },
});

const Item = styled("div", {});

export function Issues(props: IssuesProps) {
  return (
    <Root compact={props.compact}>
      <Stack space="0">
        {props.issues.map((p, i) => (
          <Item>
            {i + 1}. {p.location.file} ({p.location.line}, {p.location.column})
            - {p.message}
          </Item>
        ))}
      </Stack>
    </Root>
  );
}
