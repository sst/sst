import { styled } from "~/stitches.config";

export const Anchor = styled("a", {
  fontWeight: 600,
  cursor: "pointer",
  color: "$hiContrast",
  "&:hover": {
    textDecoration: "underline",
  },
  variants: {
    color: {
      neutral: {
        color: "$hiContrast",
      },
      highlight: {
        color: "$highlight",
      },
    },
  },
  defaultVariants: {
    color: "neutral",
  },
});
