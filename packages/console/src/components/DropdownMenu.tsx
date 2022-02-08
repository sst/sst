import { styled, keyframes } from "~/stitches.config";
import * as DropdownMenuPrimitive from "@radix-ui/react-dropdown-menu";

const slideUpAndFade = keyframes({
  "0%": { opacity: 0, transform: "translateY(2px)" },
  "100%": { opacity: 1, transform: "translateY(0)" },
});

const slideRightAndFade = keyframes({
  "0%": { opacity: 0, transform: "translateX(-2px)" },
  "100%": { opacity: 1, transform: "translateX(0)" },
});

const slideDownAndFade = keyframes({
  "0%": { opacity: 0, transform: "translateY(-2px)" },
  "100%": { opacity: 1, transform: "translateY(0)" },
});

const slideLeftAndFade = keyframes({
  "0%": { opacity: 0, transform: "translateX(2px)" },
  "100%": { opacity: 1, transform: "translateX(0)" },
});

export const Content = styled(DropdownMenuPrimitive.Content, {
  backgroundColor: "$loContrast",
  border: "1px solid $border",
  marginTop: "$sm",
  minWidth: 250,
  boxShadow:
    "rgba(32, 39, 44, 0.08) 0px 0px 1px, rgba(32, 39, 44, 0.08) 0px 2px 8px",
  borderRadius: 6,
  "@media (prefers-reduced-motion: no-preference)": {
    animationDuration: "400ms",
    animationTimingFunction: "cubic-bezier(0.16, 1, 0.3, 1)",
    willChange: "transform, opacity",
    '&[data-state="open"]': {
      '&[data-side="top"]': { animationName: slideDownAndFade },
      '&[data-side="right"]': { animationName: slideLeftAndFade },
      '&[data-side="bottom"]': { animationName: slideUpAndFade },
      '&[data-side="left"]': { animationName: slideRightAndFade },
    },
  },
});

const itemStyles = {
  all: "unset",
  fontSize: "$sm",
  height: 32,
  display: "flex",
  alignItems: "center",
  padding: "0 12px",
  position: "relative",
  userSelect: "none",
  borderRadius: 4,

  "&[data-disabled]": {
    color: "$accent",
    pointerEvents: "none",
  },

  "&:focus": {
    background: "$accent",
  },
  "&:hover": {
    background: "$accent",
  },
};

export const Item = styled(DropdownMenuPrimitive.Item, { ...itemStyles });
export const CheckboxItem = styled(DropdownMenuPrimitive.CheckboxItem, {
  ...itemStyles,
});
export const RadioItem = styled(DropdownMenuPrimitive.RadioItem, {
  ...itemStyles,
});

export const TriggerItem = styled(DropdownMenuPrimitive.TriggerItem, {
  '&[data-state="open"]': {
    backgroundColor: "$highlight",
    color: "white",
  },
  ...itemStyles,
});

export const Label = styled(DropdownMenuPrimitive.Label, {
  fontSize: "$sm",
  color: "$gray10",
  marginBottom: "$sm",
});

export const Group = styled("div", {
  padding: "$md",
  paddingBottom: "12px",
  borderTop: "1px solid $border",
  "&:first-child": {
    borderTop: 0,
  },
});

export const Seperator = styled(DropdownMenuPrimitive.Separator, {
  height: 1,
  backgroundColor: "$border",
  margin: 5,
});

export const ItemIndicator = styled(DropdownMenuPrimitive.ItemIndicator, {
  position: "absolute",
  left: 0,
  width: 25,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
});

export const Arrow = styled(DropdownMenuPrimitive.Arrow, {
  fill: "white",
});

export const Root = DropdownMenuPrimitive.Root;
export const Trigger = DropdownMenuPrimitive.Trigger;
