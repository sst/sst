import { forwardRef } from "react";
import { styled, theme } from "~/stitches.config";

type Spaces = keyof typeof theme["space"];

const Root = styled("div", {
  display: "flex",
  flexDirection: "column",
  maxWidth: "100%",
  "& > *:first-child": {
    marginTop: 0,
  },
  variants: {
    alignHorizontal: {
      center: {
        alignItems: "center",
      },
      end: {
        alignItems: "flex-end",
      },
      start: {
        alignItems: "flex-start",
      },
      stretch: {
        alignItems: "stretch",
      },
    },
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
