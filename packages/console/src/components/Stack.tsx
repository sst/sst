import { ScaleValue } from "@stitches/react";
import { forwardRef } from "react";
import { styled, theme, CSS } from "~/stitches.config";

type Spaces = keyof typeof theme["space"];

const Root = styled("div", {
  display: "flex",
  flexDirection: "column",
  "& > *:first-child": {
    marginTop: 0,
  },
});

type ComponentProps = React.ComponentProps<typeof Root> & {
  space: Spaces;
};

// Wrap stitches component with react component
export const Stack = forwardRef<React.ElementRef<typeof Root>, ComponentProps>(
  ({ space, ...props }, forwardedRef) => {
    // use someNewProp here and forward rest
    return (
      <Root
        ref={forwardedRef}
        css={{
          "& > *": {
            marginTop: theme.space[space],
          },
        }}
        {...props}
      />
    );
  }
);
