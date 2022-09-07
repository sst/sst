import { style } from "@vanilla-extract/css";
import { vars } from "../vars.css";

export const empty = style({
  width: "100%",
  height: "300px",
  display: "flex",
  fontSize: "1.5rem",
  alignItems: "center",
  justifyContent: "center",
  color: vars.colors.text.dimmed,
});
