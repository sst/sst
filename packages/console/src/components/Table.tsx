import { styled } from "@stitches/react";

export const Root = styled("table", {
  width: "100%",
  borderSpacing: 0,
});
export const Head = styled("thead");
export const Body = styled("tbody");
export const Row = styled("tr", {});
export const Header = styled("th", {
  textAlign: "left",
  background: "$gray2",
  border: 0,
  borderColor: "$border",
  borderStyle: "solid",
  borderTopWidth: "1px",
  borderBottomWidth: "1px",
  padding: "$sm $md",
  fontSize: "$sm",
  fontWeight: 500,

  "&:first-child": {
    borderLeftWidth: "1px",
    borderTopLeftRadius: "6px",
    borderBottomLeftRadius: "6px",
  },

  "&:last-child": {
    borderRightWidth: "1px",
    borderTopRightRadius: "6px",
    borderBottomRightRadius: "6px",
  },
});

export const Cell = styled("td", {
  textAlign: "left",
  padding: "$md",
  fontSize: "$sm",
  lineHeight: "1.5",
});

export const Toolbar = styled("div", {
  display: "flex",
  justifyContent: "flex-end",
});
