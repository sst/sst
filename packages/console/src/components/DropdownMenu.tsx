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
  minWidth: 220,
  backgroundColor: "$loContrast",
  borderRadius: 6,
  padding: "$sm",
  boxShadow:
    "0px 10px 38px -10px rgba(22, 23, 24, 0.35), 0px 10px 20px -15px rgba(22, 23, 24, 0.2)",
  border: "1px solid $border",
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
  borderRadius: 3,
  display: "flex",
  alignItems: "center",
  padding: "$sm",
  position: "relative",
  userSelect: "none",

  "&[data-disabled]": {
    color: "$border",
    pointerEvents: "none",
  },

  "&:focus": {
    backgroundColor: "$highlight",
    color: "white",
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

export const Label = styled(DropdownMenuPrimitive.Label, {});

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
