import { styled } from "~/stitches.config";

export const Badge = styled("div", {
  fontWeight: 600,
  textAlign: "center",
  display: "inline-block",
  variants: {
    size: {
      md: {
        padding: "$sm $md",
        fontSize: "$sm",
        borderRadius: "6px",
      },
      sm: {
        padding: "$xs $md",
        fontSize: "$xs",
        borderRadius: "4px",
      },
    },
    color: {
      success: {
        border: "2px solid $green6",
        color: "$green10",
      },
      neutral: {
        border: "2px solid $gray8",
        color: "$gray11",
      },
      highlight: {
        border: "2px solid $gray8",
        color: "$gray11",
      },
    },
  },
  defaultVariants: {
    size: "md",
    color: "neutral",
  },
});
