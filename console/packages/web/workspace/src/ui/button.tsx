import { styled } from "@macaron-css/solid";
import { theme } from "./theme";

export const Button = styled("button", {
  base: {
    appearance: "none",
    borderRadius: 4,
    border: "1px solid",
    padding: `0.625rem 1rem`,
    fontSize: `0.8125rem`,
    fontWeight: 500,
    lineHeight: 1,
    fontFamily: theme.font.mono,
    transitionDelay: "0s, 0s",
    transitionDuration: "0.2s, 0.2s",
    transitionProperty: "background-color, border",
    transitionTimingFunction: "ease-out, ease-out",
  },
  variants: {
    color: {
      danger: {
        backgroundColor: theme.color.danger.surface,
        borderColor: theme.color.danger.border,
        boxShadow: theme.color.danger.shadow,
        color: theme.color.danger.foreground,
        ":hover": {
          borderColor: theme.color.danger.hover.border,
          backgroundColor: theme.color.danger.hover.surface,
        },
        ":active": {
          borderColor: theme.color.danger.active.border,
          backgroundColor: theme.color.danger.active.surface,
          transform: "translateY(1px)",
          boxShadow: "none",
        },
      },
    },
  },
});
