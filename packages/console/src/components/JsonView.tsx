import { styled } from "@stitches/react";
import { ComponentProps } from "react";
import ReactJson from "react-json-view";
import { theme } from "~/stitches.config";

export const Root = styled("div", {
  "& *": {
    fontFamily: "$sans !important",
    opacity: "1 !important",
    letterSpacing: "unset !important",
  },
  "& .icon-container": {
    position: "relative",
    top: "4px",
  },
});

type Props = ComponentProps<typeof ReactJson>;

export const Content = (props: Props) => {
  return (
    <ReactJson
      displayDataTypes={false}
      theme={
        {
          base00: theme.colors.loContrast,
          base01: "red",
          // Vertical line
          base02: theme.colors.border,
          base03: "red",
          // Collapse summary
          base04: theme.colors.hiContrast,
          base05: "red",
          base06: "red",
          // Keys
          base07: theme.colors.hiContrast,
          base08: "red",
          // Values
          base09: theme.colors.green10,
          // Nulls
          base0A: theme.colors.hiContrast,
          // Numbers
          base0B: theme.colors.hiContrast,
          base0C: "red",
          // Arrow open
          base0D: theme.colors.hiContrast,
          // Arrow closed
          base0E: theme.colors.hiContrast,
          base0F: theme.colors.hiContrast,
        } as any
      }
      collapsed
      {...props}
    />
  );
};
