import { forwardRef } from "react";
import { styled, theme } from "~/stitches.config";

type Spaces = keyof (typeof theme)["space"];

const Root = styled("div", {});

type ComponentProps = React.ComponentProps<typeof Root> & {
  horizontal?: Spaces;
  vertical?: Spaces;
};

// Wrap stitches component with react component
export const Spacer = forwardRef<React.ElementRef<typeof Root>, ComponentProps>(
  ({ horizontal, vertical, ...props }, forwardedRef) => {
    // use someNewProp here and forward rest
    return (
      <Root
        ref={forwardedRef}
        css={{
          paddingTop: vertical ? theme.space[vertical] : 0,
          paddingRight: horizontal ? theme.space[horizontal] : 0,
        }}
        {...props}
      />
    );
  }
);
