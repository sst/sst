import { style, keyframes, styleVariants } from '@vanilla-extract/css';
import { vars } from "../vars.css";

const base = style({
  outline: "none",
  cursor: "pointer",
  display: "inline-block",

  lineHeight: 1.5,
  fontWeight: 600,
  fontSize: "1rem",
  textAlign: "center",
  fontFamily: vars.fonts.body,

  borderRadius: "0.25rem",

  padding: "0.375rem 0.75rem",

  boxShadow: "rgb(0 0 0 / 0%) 0px 0px 0px 0px"
    + ", rgb(0 0 0 / 0%) 0px 0px 0px 0px"
    + ", rgb(0 0 0 / 12%) 0px 1px 1px 0px"
    + ", rgb(0 0 0 / 0%) 0px 0px 0px 0px"
    + ", rgb(0 0 0 / 0%) 0px 0px 0px 0px"
    + ", rgb(22 35 40 / 3%) 0px 1px 5px 0px",

  transition: "background-color .24s"
    + ", border-color .24s"
    + ", box-shadow .24s",

  ":hover": {
    boxShadow: "rgb(0 0 0 / 0%) 0px 0px 0px 0px"
      + ", rgb(0 0 0 / 0%) 0px 0px 0px 0px"
      + ", rgb(0 0 0 / 12%) 0px 1px 1px 0px"
      + ", rgb(0 0 0 / 0%) 0px 0px 0px 0px"
      + ", rgb(22 35 40 / 8%) 0px 2px 9px 0px"
      + ", rgb(22 35 40 / 3%) 0px 1px 5px 0px",
  },
});

export const button = styleVariants({
  primary: [base, {
    color: "white",
    backgroundColor: vars.buttons.primary.color,

    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: vars.buttons.primary.hover,

    boxShadow: "rgb(0 0 0 / 0%) 0px 0px 0px 0px"
      + ", rgb(0 0 0 / 0%) 0px 0px 0px 0px"
      + ", rgb(0 0 0 / 12%) 0px 1px 1px 0px"
      + ", rgb(0 0 0 / 0%) 0px 0px 0px 0px"
      + ", rgb(0 0 0 / 0%) 0px 0px 0px 0px"
      + ", rgb(22 35 40 / 8%) 0px 2px 5px 0px",

    ":hover": {
      borderColor: vars.buttons.primary.active,
      backgroundColor: vars.buttons.primary.hover,
    },

    ":active": {
      backgroundColor: vars.buttons.primary.active,
    },
  }],

  secondary: [base, {
    backgroundColor: vars.buttons.secondary.color,

    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "#BFC0C0",

    ":active": {
      backgroundColor: vars.buttons.secondary.active,
    },
  }]
});

const rotate = keyframes({
  "0%": { transform: "rotate(0deg)" },
  "100%": { transform: "rotate(360deg)" }
});

export const spinner = style({
  fontSize: "0.9rem",
  verticalAlign: "middle",
  marginRight: "0.3125rem",
  marginBottom: "0.0625rem",
  animation: `3s infinite ${rotate}`,
});