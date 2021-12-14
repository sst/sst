import { useMemo } from "react";
import { useParams } from "react-router-dom";
import { Badge, Row, Stack } from "~/components";
import { useStacks } from "~/data/aws/stacks";
import { styled } from "~/stitches.config";
import { Header } from "../components";

const Root = styled("div", {
  padding: "$lg",
  flexGrow: 1,
});

export function Detail() {
  const params = useParams();
  const stacks = useStacks();
  const [stack, func] = useMemo(() => {
    const stack = stacks.find((s) => s.info.StackName === params.stack);
    return [
      stack!,
      stack?.metadata.constructs.find((c) => c.name === params.function)!,
    ];
  }, [params.function, stacks]);

  return (
    <Root>
      <Row alignHorizontal="justify">
        <Header>{func?.name}</Header>
        <Badge>{stack.info.StackName}</Badge>
      </Row>
    </Root>
  );
}
