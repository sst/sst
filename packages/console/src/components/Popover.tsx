import { styled, keyframes } from "@stitches/react";
import * as Popover from "@radix-ui/react-popover";

const slideDown = keyframes({
  "0%": { opacity: 0, transform: "translateY(-10px)" },
  "100%": { opacity: 1, transform: "translateY(0)" },
});

const slideUp = keyframes({
  "0%": { opacity: 0, transform: "translateY(10px)" },
  "100%": { opacity: 1, transform: "translateY(0)" },
});

const StyledContent = styled(Popover.Content, {
  animationDuration: "0.6s",
  animationTimingFunction: "cubic-bezier(0.16, 1, 0.3, 1)",
  '&[data-side="top"]': { animationName: slideUp },
  '&[data-side="bottom"]': { animationName: slideDown },
});

export const Root = Popover.Root;
export const Trigger = styled(Popover.Trigger, {
  background: "transparent",
  border: 0,
  padding: 0,
});
export const Content = StyledContent;
