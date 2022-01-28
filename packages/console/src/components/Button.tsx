import { styled } from "~/stitches.config";

export const Button = styled("button", {
  border: 0,
  background: "transparent",
  cursor: "pointer",
  fontFamily: "$sans",
  fontWeight: 600,
  borderRadius: 4,
  "&:active": {
    transform: "translateY(1px)",
  },
  variants: {
    size: {
      sm: {
        height: 36,
        padding: "0 $lg",
        fontSize: "$sm",
      },
      md: {
        height: 42,
        padding: "0 $lg",
        fontSize: "$md",
      },
    },
    color: {
      highlight: {
        background: "$highlight",
        color: "white",
      },
      ghost: {
        background: "transparent",
        color: "$highlight",
      },
    },
  },
  defaultVariants: {
    color: "highlight",
    size: "sm",
  },
});
