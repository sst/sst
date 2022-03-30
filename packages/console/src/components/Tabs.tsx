import * as Tabs from "@radix-ui/react-tabs";
import { styled } from "~/stitches.config";

export const Root = Tabs.Root;

export const List = styled(Tabs.List, {
  display: "flex",
  fontFamily: "$sans",
  borderBottom: "1px solid $border",
});

export const Trigger = styled(Tabs.Trigger, {
  background: "transparent",
  border: "none",
  padding: "$md",
  fontFamily: "$sans",
  cursor: "pointer",
  '&[data-state="active"]': {
    backgroundColor: "$border",
  },
  color: "$hiContrast",
});

export const Content = styled(Tabs.Content, {});
