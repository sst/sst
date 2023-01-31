import { styled } from "~/stitches.config";
import {} from "react-icons";
import {
  AiOutlineClose,
  AiOutlineCloseCircle,
  AiOutlineCloseSquare,
} from "react-icons/ai";

export const Root = styled("div", {
  borderLeft: "1px solid $border",
  width: 400,
  flexShrink: 0,
  position: "relative",
  overflowY: "auto",
});

export const Header = styled("div", {
  height: 70,
  display: "flex",
  padding: "0 $lg",
  alignItems: "center",
  justifyContent: "space-between",
});

export const Content = styled("div", {
  padding: "0 $lg",
});

export const Toolbar = styled("div", {
  display: "flex",
  justifyContent: "end",
  row: "$md",
});

export const Close = styled(AiOutlineClose, {
  width: 30,
  height: 30,
  background: "$accent",
  border: "1px solid $border",
  borderRadius: 4,
  cursor: "pointer",
  display: "block",
  padding: "$sm",
  color: "$hiContrast",
});
