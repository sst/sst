import { styled, theme, CSS } from "~/stitches.config";

type Spaces = keyof typeof theme["space"];

const keys = Object.keys(theme.space) as Spaces[];
const space = Object.fromEntries(
  keys.map((space) => [space, createSpace(space)])
) as Record<Spaces, CSS>;

// TODO: Is there a better way to do this?
// Grid approach has other side effects
function createSpace(space: Spaces): CSS {
  return {
    "& > *": {
      marginTop: "$" + space,
    },
  };
}

export const Stack = styled("div", {
  display: "flex",
  flexDirection: "column",
  variants: {
    space,
  },
  "& > *:first-child": {
    marginTop: 0,
  },
});
