import { style } from "@vanilla-extract/css";
import { vars, constants } from "../vars.css";

export const navbar = style({
  padding: "0.5rem 1rem 1rem",
  backgroundColor: vars.colors.brand,
});

export const header = style({
  paddingBottom: "0.8rem",
  textAlign: "center",
});

export const title = style({
  color: "white",
  fontWeight: 900,
  fontSize: "1.5rem",
  textShadow: "1px 1px 2px pink",
});

export const logo = style({
  marginRight: "0.1rem",
  verticalAlign: "2px",
  fontSize: "0.9rem",
});

export const form = style({
  display: "flex",
  alignItems: "stretch",
  "@media": {
    [`screen and (max-width: ${constants.mobileWidth})`]: {
      display: "block",
    },
  },
});

export const field = style({
  flex: "1 1 auto",
  marginRight: "1rem",
  "@media": {
    [`screen and (max-width: ${constants.mobileWidth})`]: {
      width: "100%",
      display: "block",
      textAlign: "center",
      margin: "0 0 1rem 0",
    },
  },
});

export const button = style({
  "@media": {
    [`screen and (max-width: ${constants.mobileWidth})`]: {
      width: "100%",
      display: "block",
    },
  },
});
