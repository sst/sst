import { styled } from "~/stitches.config";

export const Badge = styled("div", {
  fontWeight: 600,
  variants: {
    size: {
      md: {
        padding: "$sm $md",
        borderRadius: "6px",
        fontSize: "$sm",
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
