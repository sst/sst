import * as Accordian from "@radix-ui/react-accordion";
import { styled, keyframes } from "~/stitches.config";
import { BsChevronDown } from "react-icons/bs";

const slideDown = keyframes({
  from: { height: 0 },
  to: { height: "var(--radix-accordion-content-height)" },
});

const slideUp = keyframes({
  from: { height: "var(--radix-accordion-content-height)" },
  to: { height: 0 },
});

export const Root = styled(Accordian.Root, {});

export const Item = styled(Accordian.Item, {});

export const Header = styled(Accordian.Header, {});

export const Trigger = styled(Accordian.Trigger, {
  fontWeight: 600,
  display: "flex",
  alignItems: "center",
  color: "$gray12",
  border: 0,
  padding: "$md $lg",
  background: "$border",
  width: "100%",
  fontFamily: "$sans",
  fontSize: "$sm",
  cursor: "pointer",
  textAlign: "left",
  wordWrap: "break-word",
  justifyContent: "space-between",
});

export const Content = styled(Accordian.Content, {
  overflow: "hidden",
  '&[data-state="open"]': {
    animation: `${slideDown} 300ms`,
  },
  '&[data-state="closed"]': {
    animation: `${slideUp} 300ms`,
  },
  backgroundColor: "cyan",
});

export const Icon = styled(BsChevronDown, {
  transition: "transform 300ms",
  "[data-state=open] &": { transform: "rotate(180deg)" },
});
