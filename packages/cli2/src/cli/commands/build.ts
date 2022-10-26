import { Stacks } from "@core/stacks/index.js";

export async function Build() {
  const fn = await Stacks.build();
  await Stacks.synth({
    fn,
    mode: "deploy",
  });
}
