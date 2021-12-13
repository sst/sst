import { Stack } from "~/components/Stack";
import { useStacks } from "~/data/aws/stacks";
import { Header } from "../common";
import * as R from "remeda";

export function Functions() {
  const stacks = useStacks();

  return (
    <>
      <Stack space="md">
        <Header>Functions</Header>
        {R.pipe(
          stacks,
          R.flatMap((x) => x.metadata.constructs),
          R.filter((x) => x.type === "Function"),
          R.map((x) => (
            <div>
              {x.name} {x.functionArn}
            </div>
          ))
        )}
      </Stack>
    </>
  );
}
